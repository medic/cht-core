const db = require('../db');
const userDb = require('../services/user-db');

const validateDocUpdate = userDb.validateDocUpdate.toString();

const migrateDb = (dbName) => {
  const metaDb = db.get(dbName);
  return metaDb
    .get('_design/medic-user')
    .then(ddoc => {
      if (ddoc.validate_doc_update && ddoc.validate_doc_update === validateDocUpdate) {
        return;
      }

      ddoc.validate_doc_update = validateDocUpdate;
      return metaDb.put(ddoc);
    })
    .then(() => {
      db.close(metaDb);
    })
    .catch(err => {
      db.close(metaDb);
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
        .reduce((promise, dbName) => promise.then(() => migrateDb(dbName)), Promise.resolve());
    });
  },
};
