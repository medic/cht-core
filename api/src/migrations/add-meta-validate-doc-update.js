const db = require('../db');
const userDb = require('../services/user-db');

const migradeDb = (dbName) => {
  const metaDb = db.get(dbName);
  return metaDb
    .get('_design/medic-user')
    .then(ddoc => {
      ddoc.validate_doc_update = userDb.validateDocUpdate.toString();
      return metaDb.put(ddoc);
    })
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }
    });
};

module.exports = {
  name: 'add-meta-validate-doc-update',
  created: new Date(2020, 5, 4),
  run: () => {
    return db.allDbs().then(dbs => {
      return dbs
        .filter(dbName => userDb.isDbName(dbName))
        .reduce((promise, dbName) => promise.then(() => migradeDb(dbName)), Promise.resolve());
    });
  },
};
