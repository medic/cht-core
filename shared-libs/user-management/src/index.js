const config = require('./libs/config');
const db = require('./libs/db');
const bulkUploadLog = require('./bulk-upload-log');
const roles = require('./roles');
const tokenLogin = require('./token-login');
const users = require('./users');

module.exports = (sourceConfig, sourceDb) => {
  config.init(sourceConfig);
  db.init(sourceDb);
  return {
    bulkUploadLog,
    roles,
    tokenLogin,
    users
  };
};

