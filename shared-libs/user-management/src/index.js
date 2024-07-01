const config = require('./libs/config');
const db = require('./libs/db');
const dataContext = require('./libs/data-context');
const lineage = require('./libs/lineage');
const bulkUploadLog = require('./bulk-upload-log');
const roles = require('./roles');
const tokenLogin = require('./token-login');
const users = require('./users');

module.exports = (sourceConfig, sourceDb, sourceDataContext) => {
  config.init(sourceConfig);
  db.init(sourceDb);
  dataContext.init(sourceDataContext);
  lineage.init(require('@medic/lineage')(Promise, db.medic));

  return {
    bulkUploadLog,
    roles,
    tokenLogin,
    users
  };
};

