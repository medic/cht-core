const db = require('../db');
const environment = require('../environment');
const cache = require('./cache');
const crypto = require('crypto');

const purgeDbs = {};
const getRoleHash = roles => crypto
  .createHash('md5')
  .update(JSON.stringify(roles.sort()), 'utf8')
  .digest('hex');

const purgedFakeRev = roles => `2-${getRoleHash(roles)}`;
const PURGED = 'purged';

const getPurgeDb = roles => {
  const hash = getRoleHash(roles);
  console.log(hash);
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

const getPurgedIds = (roles, docIds) => {
  const cacheKey = getCacheKey(roles, docIds);
  const cached = cache.get(cacheKey);
  if (cached) {
    cache.ttl(cacheKey);
    return Promise.resolve(cached);
  }

  const purgeDb = getPurgeDb(roles);
  const ids = docIds.map(getPurgedId);

  return purgeDb
    .changes({ doc_ids: ids, batch_size: ids.length + 1, seq_interval: ids.length })
    .then(result => getPurgedIdsFromChanges(result));
};

const getPurgedIdsSince = (roles, docIds, { checkPointerId = '', limit = 100 } = {}) => {
  const purgeDb = getPurgeDb(roles);
  const ids = docIds.map(getPurgedId);

  return getCheckPointer(purgeDb, checkPointerId)
    .then(checkPointer => {
      console.log(checkPointer, 'checkpointer');
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
      return {
        purgedDocIds,
        lastSeq: result.last_seq
      };
    });
};

const getCheckPointer = (db, checkPointerId) => db
  .get(`_local/${checkPointerId}`)
  .catch(() => ({
    _id: `_local/${checkPointerId}`,
    last_seq: 0
  }));

const writeCheckPointer = (roles, checkPointerId, seq = 0) => {
  const purgeDb = getPurgeDb(roles);

  return Promise
    .all([
      getCheckPointer(purgeDb, checkPointerId),
      purgeDb.info()
    ])
    .then(([ checkPointer, info ]) => {
      console.log(checkPointer, 'checkpointer');
      checkPointer.last_seq = seq === 'now' ? info.update_seq : seq;
      purgeDb.put(checkPointer);
    });
};

module.exports = {
  getPurgedIds,
  getPurgedIdsSince,
  getCheckPointer,
  writeCheckPointer,

};
