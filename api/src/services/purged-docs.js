const db = require('../db');
const dbWatcher = require('./db-watcher');
const environment = require('../environment');
const purgingUtils = require('@medic/purging-utils');
const logger = require('../logger');
const config = require('../config');
const configWatcher = require('./config-watcher');
const _ = require('lodash');

const DB_NOT_FOUND_ERROR = new Error('not_found');
const USER_DOC_PREFIX = 'org.couchdb.user:';
const getPurgeDb = (roles) => {
  const hash = purgingUtils.getRoleHash(roles);
  const dbName = purgingUtils.getPurgeDbName(environment.db, hash);
  return db.exists(dbName).then(purgeDb => {
    if (!purgeDb) {
      throw DB_NOT_FOUND_ERROR;
    }
    return purgeDb;
  });
};

const catchDbNotFoundError = (err, purgeDb) => {
  if (err !== DB_NOT_FOUND_ERROR) {
    db.close(purgeDb);
    throw err;
  }
};

const catchDocNotFoundError = (err) => {
  if (err?.status !== 404) {
    throw err;
  }
};

const getCacheDocId = (username) => `purged-docs-${username}`;

const clearCache = async (username) => {
  if (!username) {
    logger.info('Wiping purged docs cache');
    return await db.wipeCacheDb();
  }

  const cacheDocId = getCacheDocId(username);
  try {
    const cacheDoc = await getPurgeCacheDoc(cacheDocId);
    logger.debug('Wiping purged docs cache for user %s', username);
    cacheDoc && await db.cache.remove(cacheDoc);
  } catch (err) {
    catchDocNotFoundError(err);
  }
};

const getPurgedIdsFromChanges = result => {
  const purgedIds = [];
  if (!result || !result.results) {
    return purgedIds;
  }

  result.results.forEach(change => {
    if (!change.deleted) {
      purgedIds.push(purgingUtils.extractId(change.id));
    }
  });
  return purgedIds;
};

const getPurgeCacheDoc = async (cacheDocId) => {
  try {
    return await db.cache.get(cacheDocId);
  } catch (err) {
    catchDocNotFoundError(err);
  }
};

const getCachedIds = async (cacheDocId) => {
  const cachedDoc = await getPurgeCacheDoc(cacheDocId);
  return cachedDoc?.doc_ids;
};

const setCachedIds = async (cacheDocId, ids) => {
  ids.sort();
  const cachedDoc = await getPurgeCacheDoc(cacheDocId) || { _id: cacheDocId };
  cachedDoc.doc_ids = ids;
  await db.cache.put(cachedDoc);
};

const getPurgedIds = async (userCtx, docIds, useCache = true) => {
  let purgeIds = [];
  const cacheDocId = getCacheDocId(userCtx.name);
  if (!docIds?.length || !userCtx.roles?.length) {
    return Promise.resolve(purgeIds);
  }

  if (useCache) {
    const cachedIds = await getCachedIds(cacheDocId);
    if (cachedIds) {
      return Promise.resolve(cachedIds);
    }
  }

  const ids = docIds.map(purgingUtils.getPurgedId);
  let purgeDb;

  try {
    purgeDb = await getPurgeDb(userCtx.roles);
    // requesting _changes instead of _all_docs because it's roughly twice faster
    const changesResult = await purgeDb.changes({ doc_ids: ids, batch_size: ids.length + 1, seq_interval: ids.length });
    purgeIds = getPurgedIdsFromChanges(changesResult);
    useCache && await setCachedIds(cacheDocId, purgeIds);
    db.close(purgeDb);
  } catch (err) {
    catchDbNotFoundError(err, purgeDb);
  }

  return purgeIds;
};

const getUnPurgedIds = (userCtx, docIds) => {
  docIds.sort();
  return getPurgedIds(userCtx, docIds).then(purgedIds => _.difference(docIds, purgedIds));
};

const listen = () => {
  watchSentinel();
  watchUsers();
  watchMedic();
  watchSettings();
};

const watchSentinel = () => {
  dbWatcher.sentinel(change => {
    if (change.id.startsWith('purgelog:') && change.changes[0].rev.startsWith('1-')) {
      return clearCache();
    }
  });
};

const watchUsers = () => {
  dbWatcher.users(({ id }) => {
    if (id.startsWith(USER_DOC_PREFIX)) {
      const name = id.replace(USER_DOC_PREFIX, '');
      return clearCache(name);
    }
  });
};

const watchMedic = () => {
  dbWatcher.medic(({ id }) => {
    if (id.startsWith(USER_DOC_PREFIX)) {
      const name = id.replace(USER_DOC_PREFIX, '');
      return clearCache(name);
    }
  });
};

const watchSettings = () => {
  const key = 'district_admins_access_unallocated_messages';
  let district_admins_access_unallocated_messages = config.get(key);
  configWatcher.watch(() => {
    const newConfigValue = config.get(key);
    if (newConfigValue !== district_admins_access_unallocated_messages) {
      district_admins_access_unallocated_messages = newConfigValue;
      clearCache();
    }
  });
};

if (!process.env.UNIT_TEST_ENV) {
  clearCache();
  listen();
}

module.exports = {
  getPurgedIds,
  getUnPurgedIds,
};

