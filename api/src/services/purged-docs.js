const db = require('../db');
const environment = require('../environment');
const purgingUtils = require('@medic/purging-utils');
const logger = require('../logger');
const _ = require('lodash');

const DB_NOT_FOUND_ERROR = new Error('not_found');
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

const getCacheDocId = ({ username }) => `purged-docs-${username}`;

const clearCache = async () => {
  await db.wipeCacheDb();
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

const getCachedIds = async (cacheDocId) => {
  try {
    const cachedDoc = await db.cache.get(cacheDocId);
    return cachedDoc.doc_ids;
  } catch (err) {
    if (err.status === 404) {
      return;
    }
    throw err;
  }
};

const setCachedIds = async (cacheDocId, ids) => {
  ids.sort();
  let cachedDoc = { _id: cacheDocId, doc_ids: ids };
  try {
    cachedDoc = await db.cache.get(cacheDocId);
    cachedDoc.doc_ids = ids;
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
  }

  return await db.cache.put(cachedDoc);
};

const getPurgedIds = async (userCtx, docIds, useCache = true) => {
  let purgeIds = [];
  const cacheDocId = getCacheDocId(userCtx);
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

const listen = (seq = 'now') => {
  db.sentinel
    .changes({ live: true, since: seq })
    .on('change', change => {
      seq = change.seq;
      if (change.id.startsWith('purgelog:') && change.changes[0].rev.startsWith('1-')) {
        clearCache();
      }
    })
    .on('error', err => {
      logger.error('Error watching sentinel changes, restarting: %o', err);
      listen(seq);
    });
};

if (!process.env.UNIT_TEST_ENV) {
  listen();
}

module.exports = {
  getPurgedIds,
  getUnPurgedIds,
};

