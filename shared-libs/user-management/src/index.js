const config = require('./libs/config');
const db = require('./libs/db');
const lineage = require('./libs/lineage');
const bulkUploadLog = require('./bulk-upload-log');
const roles = require('./roles');
const tokenLogin = require('./token-login');
const users = require('./users');

module.exports = (sourceConfig, sourceDb) => {
  config.init(sourceConfig);
  db.init(sourceDb);
  lineage.init(require('@medic/lineage')(Promise, db.medic));

  return {
    bulkUploadLog,
    roles,
    tokenLogin,
    users
  };
};

