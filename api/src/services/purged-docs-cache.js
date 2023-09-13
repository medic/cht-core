const db = require('../db');
const environment = require('../environment');
const logger = require('../logger');

let purgeDb;
let destroyPromise = null;

const catchDocNotFoundError = (err) => {
  if (err?.status !== 404) {
    throw err;
  }
};

const catchDocConflictError = (err) => {
  if (err?.status !== 409) {
    throw err;
  }
};

const getCacheDocId = (username) => `purged-docs-${username}`;

const getCacheDatabase = async () => {
  if (destroyPromise) {
    await destroyPromise;
  }

  if (purgeDb) {
    return purgeDb;
  }

  purgeDb = db.get(`${environment.db}-purged-cache`);
  return purgeDb;
};

const wipe = async () => {
  if (destroyPromise) {
    return await destroyPromise;
  }

  logger.debug('Wiping purged docs cache');
  if (!purgeDb) {
    return;
  }

  destroyPromise = purgeDb.destroy();
  await destroyPromise;
  purgeDb = null;
  destroyPromise = null;
};

const getCacheDoc = async (username) => {
  try {
    const database = await getCacheDatabase();
    return await database.get(getCacheDocId(username));
  } catch (err) {
    catchDocNotFoundError(err);
  }
};

const get = async (username) => {
  if (!username) {
    return;
  }

  const cacheDoc = await getCacheDoc(username);
  return cacheDoc?.doc_ids;
};

const clear = async (username) => {
  if (!username) {
    return;
  }

  try {
    const database = await getCacheDatabase();
    const cacheDoc = await getCacheDoc(username);
    logger.debug('Wiping purged docs cache for user %s', username);
    cacheDoc && await database.remove(cacheDoc);
  } catch (err) {
    catchDocConflictError(err);
  }
};

const set = async (username, ids) => {
  if (!ids || !Array.isArray(ids)) {
    return;
  }

  ids.sort();
  try {
    const database = await getCacheDatabase();
    const cacheDoc = await getCacheDoc(username) ||  { _id: getCacheDocId(username) };
    cacheDoc.doc_ids = ids;
    await database.put(cacheDoc);
  } catch (err) {
    catchDocConflictError(err);
  }
};

module.exports = {
  get,
  set,
  clear,
  wipe,
};
