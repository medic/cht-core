const db = require('../db');
const environment = require('../environment');
const cache = require('./cache');
const crypto = require('crypto');
const logger = require('../logger');


const purgeDbName = role => `${environment.db}-${role}-purged`;
const dbsByRoles = roles => roles.map(role => db.get(purgeDbName(role)));

const getCacheKey = (roles, docIds) => {
  const hash = crypto
    .createHash('md5')
    .update(JSON.stringify(docIds), 'utf8')
    .digest('hex');

  return `purged-${JSON.stringify(roles)}-${hash}`;
};

const getPurgedId = id => `purged:${id}`;
const extractId = purgedId => purgedId.replace(/^purged:/, '');

const getPurgedIds = ({ roles = [], docIds = [], checkPointerId = '' }) => {
  const cacheKey = getCacheKey(roles, docIds);
  const cached = cache.get(cacheKey);
  if (cached) {
    cache.ttl(cacheKey);
    return Promise.resolve(cached);
  }

  const dbs = dbsByRoles(roles);
  const ids = docIds.map(getPurgedId);

  return Promise
    .all(dbs.map(db => db.changes({ doc_ids: ids, batch_size: ids.length + 1 })))
    .then(results => {
      const purged = {};
      results.forEach(result => result.results.forEach(change => !change.deleted && (purged[extractId(change.id)] = true)));
      const purgedIds = Object.keys(purged);
      cache.set(cacheKey, purgedIds);
      if (checkPointerId) {
        writeCheckPointers({ roles, checkPointerId });
      }
      return purgedIds;
    });
};

const getPurgedChanges = ({ roles = [], docIds = [], checkPointerId = '' }) => {
  const dbs = dbsByRoles(roles);
  const ids = docIds.map(getPurgedId);
  return Promise
    .all(dbs.map(db => getCheckPointer(db, checkPointerId)))
    .then(checkPointers => {
      const opts = {
        doc_ids: ids,
        batch_size: ids.length + 1,
        limit: 100
      };

      return Promise.all(dbs.map((db, idx) => db.changes(Object.assign({ since: checkPointers[idx].last_seq }, opts))))
    })
    .then(results => {
      const purged = {};
      results.forEach(result => result.results.forEach(change => !change.deleted && (purged[extractId(change.id)] = true)));

    })
};

const getCheckPointer = (db, checkPointerId) => db
  .get(`_local/${checkPointerId}`)
  .catch(() => ({
    _id: `_local/${checkPointerId}`,
    last_seq: 0
  }));

const getCheckPointers = ({ roles = [], checkPointerId = '' }) => {
  const dbs = dbsByRoles(roles);
  return Promise
    .all(dbs.map(db => getCheckPointer(db, checkPointerId)))
    .then(results => {
      const checkPointers = {};
      results.forEach((result, idx) => {
        checkPointers[roles[idx]] = result;
      });
      return checkPointers;
    });
};

const writeCheckPointers = ({ roles = [], checkPointerId = '', seqs = {} }) => {
  const dbs = dbsByRoles(roles);

  return Promise
    .all([
      getCheckPointers({ roles, checkPointerId }),
      ...dbs.map(db => db.info())
    ])
    .then(([checkPointers, ...info]) => {
      const promises = [];
      roles.forEach((role, idx) => {
        checkPointers[role].last_seq = seqs[role] || info[idx].update_seq;
        const save = dbs[idx].put(checkPointers[role]).catch(err => {
          logger.error('Error writing purge checkpointer %o', err);
        });
        promises.push(save);
      });

      return Promise.all(promises);
    });
};

module.exports = {
  getPurgedIds,
  getCheckPointers,
  writeCheckPointers,
};
