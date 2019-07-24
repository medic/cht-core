const db = require('../db');
const environment = require('../environment');
const cache = require('./cache');
const crypto = require('crypto');
const logger = require('../logger');

const purgeDbs = {};
const getRoleHash = roles => crypto
  .createHash('md5')
  .update(JSON.stringify(roles.sort()), 'utf8')
  .digest('hex');

const getPurgeDb = roles => {
  const hash = getRoleHash(roles);
  if (!purgeDbs[hash]) {
    purgeDbs[hash] = db.get(`${environment.db}-purged-role-${hash}`)
  }
  return purgeDbs[hash];
};

const getCacheKey = (roles, docIds) => {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(docIds), 'utf8')
    .digest('hex');

  return `purged-${JSON.stringify(roles)}-${hash}`;
};

const getPurgedId = id => `purged:${id}`;
const extractId = purgedId => purgedId.replace(/^purged:/, '');

const getPurgedIdsFromChanges = result => {
  const purgedIds = [];
  result.results.forEach(change => {
    if (!change.deleted) {
      purgedIds.push(extractId(change.id));
    }
  });
  return purgedIds;
};

const getPurgedIds = ({ roles = [], docIds = [], checkPointerId = '' }) => {
  const cacheKey = getCacheKey(roles, docIds);
  const cached = cache.get(cacheKey);
  if (cached) {
    cache.ttl(cacheKey);
    return Promise.resolve(cached);
  }

  const purgeDb = db.get(purgeDbName(roles));
  const ids = docIds.map(getPurgedId);

  return purgeDb
    .changes({ doc_ids: ids, batch_size: ids.length + 1 })
    .then(result => {
      const purgedIds = getPurgedIdsFromChanges(result);
      if (checkPointerId) {
        writeCheckPointer(roles, checkPointerId);
      }

      return purgedIds;
    });
};

const getPurgedChanges = ({ roles = [], docIds = [], checkPointerId = '' }) => {
  const purgeDb = getPurgeDb(roles);
  const ids = docIds.map(getPurgedId);

  return getCheckPointer(purgeDb, checkPointerId)
    .then(checkPointer => {
      const opts = {
        doc_ids: ids,
        batch_size: ids.length + 1,
        limit: 100,
        since: checkPointer.last_seq
      };

      return purgeDb.changes(opts);
    })
    .then(result => getPurgedIdsFromChanges(result));
};

const getCheckPointer = (db, checkPointerId) => db
  .get(`_local/${checkPointerId}`)
  .catch(() => ({
    _id: `_local/${checkPointerId}`,
    last_seq: 0
  }));

const writeCheckPointer = ({ roles = [], checkPointerId = '', seq = '' }) => {
  const purgeDb = getPurgeDb(roles);

  return Promise
    .all([
      getCheckPointer(purgeDb, checkPointerId),
      purgeDb.info()
    ])
    .then(([ checkPointer, info ]) => {
      checkPointer.last_seq = seq || info.update_seq;
      purgeDb.put(checkPointer);
    });
};

module.exports = {
  getPurgedIds,
  getCheckPointer,
  writeCheckPointer,
};
