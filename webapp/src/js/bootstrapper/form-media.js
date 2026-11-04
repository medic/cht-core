const { PREFIXES } = require('@medic/constants');

const CACHE_NAME = 'cht-form-media';
const DB_NAME = 'medic';
const LARGE_FORM_MEDIA_BYTES = 10 * 1024 * 1024;

let syncInProgress;

const isFormId = id => id.startsWith(PREFIXES.FORM);

const isCacheSupported = () => typeof window.caches !== 'undefined';

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

const getCachedMediaNames = (attachments) => {
  if (!isCacheSupported()) {
    return [];
  }
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

  for (const name of Object.keys(stubs)) {
    const { content_type, digest, length } = stubs[name];
    if (cachedMediaNames.includes(name)) {
      formMedia[name] = { content_type, digest, length };
    } else {
      attachments[name] = { content_type, data: await remoteDb.getAttachment(id, name, { rev }) };
    }
  }

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
    endkey: `${PREFIXES.FORM}￰`,
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

const downloadMedia = async (cache, key, { id, rev, name, content_type, length }) => {
  const response = await fetchAttachment(id, name, rev);
  await cache.put(key, new Response(response.body, { headers: { 'Content-Type': content_type } }));

  const stored = await cache.match(key);
  const { size } = await stored.blob();
  if (size !== length) {
    await cache.delete(key);
    throw new Error(`Incomplete download of [${name}] of form [${id}]: ${size} of ${length} bytes`);
  }
};

const syncAllMedia = async (localDb, onProgress = () => {}) => {
  const wanted = await getWantedMedia(localDb);
  const cache = await caches.open(CACHE_NAME);
  const storedKeys = (await cache.keys()).map(({ url }) => url);

  await Promise.all(storedKeys.filter(key => !wanted.has(key)).map(key => cache.delete(key)));

  const missing = [...wanted].filter(([key]) => !storedKeys.includes(key));
  const errors = [];
  for (const [index, [key, media]] of missing.entries()) {
    onProgress({ count: index, total: missing.length });
    try {
      await downloadMedia(cache, key, media);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) {
    throw errors[0];
  }
};

const syncMedia = (localDb, onProgress) => {
  if (!isCacheSupported()) {
    return Promise.resolve();
  }
  if (!syncInProgress) {
    syncInProgress = syncAllMedia(localDb, onProgress).finally(() => syncInProgress = undefined);
  }
  return syncInProgress;
};

const getMedia = async (formDoc, name) => {
  const media = formDoc && formDoc.form_media && formDoc.form_media[name];
  if (!media) {
    return;
  }
  if (isCacheSupported()) {
    const cache = await caches.open(CACHE_NAME);
    const stored = await cache.match(getCacheKey(media.digest));
    if (stored) {
      return stored.blob();
    }
  }
  const response = await fetchAttachment(formDoc._id, name, formDoc._rev);
  return response.blob();
};

const clear = () => isCacheSupported() ? caches.delete(CACHE_NAME) : Promise.resolve(false);

module.exports = {
  isFormId,
  replicateFormDoc,
  syncMedia,
  getMedia,
  clear,
};
