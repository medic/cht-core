const db = require('../db');
const environment = require('../environment');
const purgingUtils = require('@medic/purging-utils');
const cacheService = require('./cache');
const crypto = require('crypto');
const logger = require('../logger');
const utils = require('../controllers/utils');

const CACHE_NAME = 'purged-docs';
const DB_NOT_FOUND_ERROR = new Error('not_found');
const getPurgeDb = (roles) => {
  const hash = purgingUtils.getRoleHash(roles);
  const dbName = purgingUtils.getPurgeDbName(environment.db, hash);
  return db.exists(dbName).then(exists => {
    if (!exists) {
      throw DB_NOT_FOUND_ERROR;
    }
    return db.get(dbName, { skip_setup: true });
  });
};

const catchDbNotFoundError = (err) => {
  if (err !== DB_NOT_FOUND_ERROR) {
    throw err;
  }
};

const getCacheKey = (roles, docIds) => {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(docIds), 'utf8')
    .digest('hex');

  return `purged-${JSON.stringify(roles)}-${hash}`;
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

const getPurgedIds = (roles, docIds) => {
  let purgeIds = [];
  if (!docIds || !docIds.length || !roles || !roles.length) {
    return Promise.resolve(purgeIds);
  }

  const cache = cacheService.instance(CACHE_NAME);
  const cacheKey = getCacheKey(roles, docIds);
  const cached = cache.get(cacheKey);
  if (cached) {
    cache.ttl(cacheKey);
    return Promise.resolve(cached);
  }
  const ids = docIds.map(purgingUtils.getPurgedId);
  // requesting _changes instead of _all_docs because it's roughly twice faster
  return getPurgeDb(roles)
    .then(purgeDb => purgeDb.changes({ doc_ids: ids, batch_size: ids.length + 1, seq_interval: ids.length }))
    .then(result => {
      purgeIds = getPurgedIdsFromChanges(result);
      cache.set(cacheKey, purgeIds);
    })
    .catch(catchDbNotFoundError)
    .then(() => purgeIds);
};

const getUnPurgedIds = (roles, docIds) => {
  return getPurgedIds(roles, docIds).then(purgedIds => utils.difference(docIds, purgedIds));
};

const getPurgedIdsSince = (roles, docIds, { checkPointerId = '', limit = 100 } = {}) => {
  let purgeIds = {};
  if (!docIds || !docIds.length || !roles || !roles.length) {
    return Promise.resolve(purgeIds);
  }

  let purgeDb;
  const ids = docIds.map(purgingUtils.getPurgedId);

  return getPurgeDb(roles)
    .then(db => purgeDb = db)
    .then(() => getCheckPointer(purgeDb, checkPointerId))
    .then(checkPointer => {
      const opts = {
        doc_ids: ids,
        batch_size: ids.length + 1,
        limit: limit,
        since: checkPointer.last_seq,
        seq_interval: ids.length
      };

      return purgeDb.changes(opts);
    })
    .then(result => {
      const purgedDocIds = getPurgedIdsFromChanges(result);
      purgeIds = { purgedDocIds,  lastSeq: result.last_seq };
    })
    .catch(catchDbNotFoundError)
    .then(() => purgeIds);
};

const getCheckPointer = (db, checkPointerId) => db
  .get(`_local/${checkPointerId}`)
  .catch(() => ({
    _id: `_local/${checkPointerId}`,
    last_seq: 0
  }));

const writeCheckPointer = (roles, checkPointerId, seq = 0) => {
  let purgeDb;
  return getPurgeDb(roles)
    .then(db => purgeDb = db)
    .then(() => Promise.all([
      getCheckPointer(purgeDb, checkPointerId),
      purgeDb.info()
    ]))
    .then(([ checkPointer, info ]) => {
      checkPointer.last_seq = seq === 'now' ? info.update_seq : seq;
      return purgeDb.put(checkPointer);
    })
    .catch(catchDbNotFoundError);
};

const info = (roles) => {
  return getPurgeDb(roles)
    .catch(catchDbNotFoundError)
    .then(purgeDb => !!purgeDb && purgeDb.info());
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
  getPurgedIdsSince,
  writeCheckPointer,
  info,
};

