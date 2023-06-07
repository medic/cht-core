const db = require('../db');
const environment = require('../environment');
const purgingUtils = require('@medic/purging-utils');
const cacheService = require('./cache');
const logger = require('../logger');
const _ = require('lodash');

const CACHE_NAME = 'purged-docs';
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

const getCacheKey = (userCtx) => {
  return `purged-${JSON.stringify(userCtx.roles)}-${userCtx.name}`;
};

const clearCache = () => cacheService.instance(CACHE_NAME).flushAll();

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

const getPurgedIds = (userCtx, docIds, useCache = true) => {
  let purgeIds = [];
  let cache;
  if (!docIds || !docIds.length || !userCtx.roles || !userCtx.roles.length) {
    return Promise.resolve(purgeIds);
  }

  if (useCache) {
    cache = cacheService.instance(CACHE_NAME, { stdTTL: 0 });
    const cached = cache.get(getCacheKey(userCtx));
    if (cached) {
      return Promise.resolve(cached);
    }
  }

  const ids = docIds.map(purgingUtils.getPurgedId);
  let purgeDb;
  // requesting _changes instead of _all_docs because it's roughly twice faster
  return getPurgeDb(userCtx.roles)
    .then(tempDb => purgeDb = tempDb)
    .then(() => purgeDb.changes({ doc_ids: ids, batch_size: ids.length + 1, seq_interval: ids.length }))
    .then(result => {
      purgeIds = getPurgedIdsFromChanges(result);
      cache && cache.set(getCacheKey(userCtx), purgeIds);
      db.close(purgeDb);
    })
    .catch(err => catchDbNotFoundError(err, purgeDb))
    .then(() => purgeIds);
};

const getUnPurgedIds = (userCtx, docIds) => {
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

