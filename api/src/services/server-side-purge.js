const db = require('../db');
const environment = require('../environment');

const purgeDbName = role => `${environment.db}-${role}-purged`;
const dbsByRoles = roles => roles.map(role => db.get(purgeDbName(role)));

const getPurgedIds = context => {
  const dbs = dbsByRoles(context.userCtx.roles);
  const ids = context.allowedDocIds.map(id => `purged:${id}`);

  return Promise
    .all(dbs.map(db => db.changes({ doc_ids: ids, batch_size: ids.length + 1, since: context.since })))
    .then(results => {
      const purged = {};
      results.forEach(result => result.results.forEach(change => !change.deleted && (purged[change.id] = true)));
      return Object.keys(purged);
    });
};

const getCheckPointer = db => db
  .get(`_local/${context.replicationId}`)
  .catch(() => ({
    _id: `_local/${context.replicationId}`,
    last_seq: 0
  }));

const getCheckPointers = context => {
  const dbs = dbsByRoles(context.userCtx.roles);
  return Promise
    .all(dbs.map(getCheckPointer))
    .then(results => {
      const checkPointers = {};
      results.forEach((result, idx) => {
        checkPointers[context.userCtx.roles[idx]] = result;
      });
      return checkPointers;
    });
};

const writeCheckPointers = (context, checkPointers) => {
  const roles = context.userCtx.roles;
  const dbs = dbsByRoles(roles);

  return Promise
    .all([
      getCheckPointers(context),
      ...dbs.map(db => db.info())
    ])
    .then(([existent, ...info]) => {
      const promises = [];
      roles.forEach((role, idx) => {
        existent[role].last_seq = checkPointers[role] || info[idx].current_seq;
        promises.push(dbs[idx].put(existent[role]));
      });

      return Promise.all(promises);
    });
};

module.exports = {
  getPurgedIds,
  getCheckPointers,
  writeCheckPointers,
};
