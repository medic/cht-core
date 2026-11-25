const { PREFIXES } = require('@medic/constants');

const CACHE_NAME = 'cht-form-media';
const DB_NAME = 'medic';
const LARGE_FORM_MEDIA_BYTES = 10 * 1024 * 1024;
const MIN_FREE_BYTES = 500 * 1024 * 1024;
const RETRY_DELAY_MS = 24 * 60 * 60 * 1000;
const QUOTA_FAILURE_KEY = 'cht-form-media-quota-failure';
const MAX_DOWNLOAD_FAILURES = 3;
const DOWNLOAD_FAILURES_KEY = 'cht-form-media-download-failures';
const LOW_STORAGE = 'FORM_MEDIA_LOW_STORAGE';

let syncInProgress;
const mediaRequests = new Map();

const isFormId = id => id.startsWith(PREFIXES.FORM);

const isFormDefinition = name => name === 'xml' || name === 'form.html' || name.endsWith('.xml');

const getCacheKey = digest => new URL(`/form-media/${encodeURIComponent(digest)}`, window.location.origin).href;

const getRemoteUrl = (id, name, rev) => {
  const encodedName = name.split('/').map(encodeURIComponent).join('/');
  return `/${DB_NAME}/${encodeURIComponent(id)}/${encodedName}?rev=${encodeURIComponent(rev)}`;
};

const fetchAttachment = async (id, name, rev) => {
  const response = await fetch(getRemoteUrl(id, name, rev), { credentials: 'same-origin' });
  if (!response.ok) {
    const error = new Error(`Failed to download [${name}] of form [${id}]: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response;
};

const lowStorageError = (message, storageFull = false) => {
  const error = new Error(message);
  error.code = LOW_STORAGE;
  error.storageFull = storageFull;
  return error;
};

const isWithinRetryDelay = (time) => {
  const elapsed = Date.now() - time;
  return elapsed >= 0 && elapsed < RETRY_DELAY_MS;
};

const getLastQuotaFailure = () => Number(window.localStorage.getItem(QUOTA_FAILURE_KEY)) || 0;

const setLastQuotaFailure = (time) => window.localStorage.setItem(QUOTA_FAILURE_KEY, String(time));

const getDownloadFailures = () => JSON.parse(window.localStorage.getItem(DOWNLOAD_FAILURES_KEY)) || {};

const setDownloadFailures = (failures) => {
  window.localStorage.setItem(DOWNLOAD_FAILURES_KEY, JSON.stringify(failures));
};

const recordDownloadFailure = (key) => {
  const failures = getDownloadFailures();
  const { count = 0 } = failures[key] || {};
  setDownloadFailures({ ...failures, [key]: { count: count + 1, time: Date.now() } });
};

const keepDownloadFailures = (shouldKeep) => {
  const entries = Object.entries(getDownloadFailures());
  const kept = entries.filter(([key]) => shouldKeep(key));
  if (kept.length < entries.length) {
    setDownloadFailures(Object.fromEntries(kept));
  }
};

const isDownloadPaused = (key) => {
  const { count = 0, time = 0 } = getDownloadFailures()[key] || {};
  return count >= MAX_DOWNLOAD_FAILURES && isWithinRetryDelay(time);
};

const getDeviceFreeBytes = () => {
  const android = window.medicmobile_android;
  if (!android || typeof android.getDeviceInfo !== 'function') {
    return;
  }
  const { storage = {} } = JSON.parse(android.getDeviceInfo());
  return storage.free;
};

const getAvailableBytes = async () => {
  const { quota, usage } = await window.navigator.storage.estimate();
  const candidates = [quota - usage, getDeviceFreeBytes()].filter(Number.isFinite);
  return candidates.length ? Math.min(...candidates) : 0;
};

const getCachedMediaNames = (attachments) => {
  const names = Object.keys(attachments).filter(name => !isFormDefinition(name));
  const size = names.reduce((total, name) => total + attachments[name].length, 0);
  return size > LARGE_FORM_MEDIA_BYTES ? names : [];
};

const throwOnWriteErrors = (results, id) => {
  const failure = (results || []).find(result => result.error);
  if (failure) {
    throw new Error(`Failed to save form [${id}]: ${failure.reason || failure.error}`);
  }
};

const replicateFormDoc = async (remoteDb, localDb, { id, rev }) => {
  const doc = await remoteDb.get(id, { rev, revs: true });
  const stubs = doc._attachments || {};
  const cachedMediaNames = getCachedMediaNames(stubs);
  const attachments = {};
  const formMedia = {};

  Object.entries(stubs).forEach(([name, { content_type, digest, length }]) => {
    if (cachedMediaNames.includes(name)) {
      formMedia[name] = { content_type, digest, length };
    }
  });

  const storedNames = Object.keys(stubs).filter(name => !cachedMediaNames.includes(name));
  const data = await Promise.all(storedNames.map(name => remoteDb.getAttachment(id, name, { rev })));
  storedNames.forEach((name, index) => {
    attachments[name] = { content_type: stubs[name].content_type, data: data[index] };
  });

  doc._attachments = attachments;
  if (cachedMediaNames.length) {
    doc.form_media = formMedia;
  }

  throwOnWriteErrors(await localDb.bulkDocs([doc], { new_edits: false }), id);
  return doc;
};

const getWantedMedia = async (localDb) => {
  const { rows } = await localDb.allDocs({
    startkey: PREFIXES.FORM,
    endkey: `${PREFIXES.FORM}\ufff0`,
    include_docs: true,
  });
  const wanted = new Map();
  rows.forEach(({ doc }) => {
    Object.entries(doc.form_media || {}).forEach(([name, media]) => {
      wanted.set(getCacheKey(media.digest), { ...media, id: doc._id, rev: doc._rev, name });
    });
  });
  return wanted;
};

const saveMedia = async (cache, key, response, { id, name, length }) => {
  await cache.put(key, response);

  const stored = await cache.match(key);
  const { size } = await stored.blob();
  if (size !== length) {
    await cache.delete(key);
    throw new Error(`Incomplete download of [${name}] of form [${id}]: ${size} of ${length} bytes`);
  }
};

const assertEnoughStorage = async ({ id, name, length }) => {
  const available = await getAvailableBytes();
  if (available - length < MIN_FREE_BYTES) {
    throw lowStorageError(`Not enough storage for [${name}] of form [${id}]: ${length} bytes, ${available} available`);
  }
};

const isCached = async (cache, key) => (await cache.keys(key)).length > 0;

const downloadMedia = async (cache, key, media) => {
  const { id, rev, name } = media;
  if (await isCached(cache, key)) {
    return;
  }
  if (isDownloadPaused(key)) {
    throw new Error(`Skipping download of [${name}] of form [${id}] after repeated failures`);
  }

  await assertEnoughStorage(media);

  const response = await fetchAttachment(id, name, rev);
  try {
    await saveMedia(cache, key, response, media);
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      setLastQuotaFailure(Date.now());
      throw lowStorageError(`Storage full while saving [${name}] of form [${id}]`, true);
    }
    recordDownloadFailure(key);
    throw err;
  }
  keepDownloadFailures(failedKey => failedKey !== key);
};

const tryDownload = async (cache, key, media) => {
  try {
    await downloadMedia(cache, key, media);
  } catch (error) {
    return error;
  }
};

const downloadAll = (cache, missing, onProgress) => {
  const downloadFrom = async (index, errors) => {
    if (index >= missing.length || errors.some(error => error.storageFull)) {
      return errors;
    }
    onProgress({ count: index, total: missing.length });
    const [key, media] = missing[index];
    const error = await tryDownload(cache, key, media);
    const result = await downloadFrom(index + 1, error ? [...errors, error] : errors);
    if (index === missing.length - 1) {
      onProgress({ count: missing.length, total: missing.length });
    }
    return result;
  };
  return downloadFrom(0, []);
};

const syncAllMedia = async (localDb, onProgress = () => {}) => {
  const wanted = await getWantedMedia(localDb);
  const cache = await window.caches.open(CACHE_NAME);
  const storedKeys = (await cache.keys()).map(({ url }) => url);

  await Promise.all(storedKeys.filter(key => !wanted.has(key)).map(key => cache.delete(key)));

  keepDownloadFailures(key => wanted.has(key));

  const missing = [...wanted].filter(([key]) => !storedKeys.includes(key));
  if (!missing.length) {
    return;
  }

  if (isWithinRetryDelay(getLastQuotaFailure())) {
    throw lowStorageError(`Skipping ${missing.length} form media downloads after recently running out of storage`);
  }
  setLastQuotaFailure(0);

  const errors = await downloadAll(cache, missing, onProgress);
  if (errors.length) {
    throw errors[0];
  }
};

const syncMedia = (localDb, onProgress) => {
  if (!syncInProgress) {
    syncInProgress = syncAllMedia(localDb, onProgress).finally(() => syncInProgress = undefined);
  }
  return syncInProgress;
};

const isFormMedia = (formDoc, name) => {
  const { form_media: formMedia = {} } = formDoc || {};
  return Boolean(formMedia[name]);
};

const storeBlob = async (cache, key, blob, media) => {
  try {
    if (blob.size !== media.length) {
      throw new Error(`Incomplete download: ${blob.size} of ${media.length} bytes`);
    }
    await assertEnoughStorage(media);
    await cache.put(key, new Response(blob, { headers: { 'Content-Type': media.content_type } }));
  } catch (err) {
    console.warn(`Could not store [${media.name}] of form [${media.id}]`, err);
  }
};

const fetchBlob = async ({ id, rev, name }) => {
  const response = await fetchAttachment(id, name, rev);
  return response.blob();
};

const requestMedia = (cache, key, media) => {
  if (!mediaRequests.has(key)) {
    const request = fetchBlob(media);
    mediaRequests.set(key, request);
    request
      .then(blob => storeBlob(cache, key, blob, media))
      .then(() => mediaRequests.delete(key), () => mediaRequests.delete(key));
  }
  return mediaRequests.get(key);
};

const getMedia = async (formDoc, name) => {
  if (!isFormMedia(formDoc, name)) {
    return;
  }
  const cache = await window.caches.open(CACHE_NAME);
  const media = { ...formDoc.form_media[name], id: formDoc._id, rev: formDoc._rev, name };
  const key = getCacheKey(media.digest);
  const stored = await cache.match(key);
  if (stored) {
    return stored.blob();
  }
  return requestMedia(cache, key, media);
};

const clear = () => window.caches.delete(CACHE_NAME);

module.exports = {
  LOW_STORAGE,
  isFormId,
  isFormMedia,
  replicateFormDoc,
  syncMedia,
  getMedia,
  clear,
};
