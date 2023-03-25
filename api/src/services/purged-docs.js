const db = require('../db');
const environment = require('../environment');
const purgingUtils = require('@medic/purging-utils');
const cacheService = require('./cache');
const crypto = require('crypto');
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
  let purgeDb;
  // requesting _changes instead of _all_docs because it's roughly twice faster
  return getPurgeDb(roles)
    .then(tempDb => purgeDb = tempDb)
    .then(() => purgeDb.changes({ doc_ids: ids, batch_size: ids.length + 1, seq_interval: ids.length }))
    .then(result => {
      purgeIds = getPurgedIdsFromChanges(result);
      cache.set(cacheKey, purgeIds);
      db.close(purgeDb);
    })
    .catch(err => catchDbNotFoundError(err, purgeDb))
    .then(() => purgeIds);
};

const getUnPurgedIds = (roles, docIds) => {
  return getPurgedIds(roles, docIds).then(purgedIds => _.difference(docIds, purgedIds));
};

const getPurgedIdsSince = (roles, docIds, { checkPointerId = '', limit = 100 } = {}) => {
  let purgeIds = {};
  if (!docIds || !docIds.length || !roles || !roles.length) {
    return Promise.resolve(purgeIds);
  }

  let purgeDb;
  const ids = docIds.map(purgingUtils.getPurgedId);

  return getPurgeDb(roles)
    .then(tempDb => purgeDb = tempDb)
    .then(() => getLastSeq(purgeDb, checkPointerId))
    .then(lastSeq => {
      const opts = {
        doc_ids: ids,
        batch_size: ids.length + 1,
        limit: limit,
        since: lastSeq,
        seq_interval: ids.length
      };

      return purgeDb.changes(opts);
    })
    .then(result => {
      const purgedDocIds = getPurgedIdsFromChanges(result);
      purgeIds = { purgedDocIds,  lastSeq: result.last_seq };
      db.close(purgeDb);
    })
    .catch(err => catchDbNotFoundError(err, purgeDb))
    .then(() => purgeIds);
};

const getCheckPointer = (db, checkPointerId) => {
  return db
    .get(`_local/${checkPointerId}`)
    .catch(() => ({
      _id: `_local/${checkPointerId}`,
      last_seq: 0
    }));
};

const getLastSeq = (db, checkPointerId) => {
  if (!checkPointerId) {
    return Promise.resolve(0);
  }
  return getCheckPointer(db, checkPointerId)
    .then(doc => doc.last_seq);
};

const writeCheckPointer = (roles, checkPointerId, seq = 0) => {
  let purgeDb;
  return getPurgeDb(roles)
    .then(tempDb => purgeDb = tempDb)
    .then(() => Promise.all([
      getCheckPointer(purgeDb, checkPointerId),
      purgeDb.info()
    ]))
    .then(([ checkPointer, info ]) => {
      checkPointer.last_seq = seq === 'now' ? info.update_seq : seq;
      return purgeDb.put(checkPointer);
    })
    .then(result => {
      db.close(purgeDb);
      return result;
    })
    .catch(err => catchDbNotFoundError(err, purgeDb));
};

const info = (roles) => {
  let purgeDb;
  return getPurgeDb(roles)
    .then(tempDb => purgeDb = tempDb)
    .then(() => purgeDb.info())
    .catch(err => catchDbNotFoundError(err, purgeDb))
    .then(info => {
      db.close(purgeDb);
      return info || false; // fetch needs valid JSON.
    });
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

