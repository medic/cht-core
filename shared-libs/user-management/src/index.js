const config = require('./libs/config');
const db = require('./libs/db');

module.exports = (sourceConfig, sourceDb) => {
  config.init(sourceConfig);
  db.init(sourceDb);

  // Load these modules after the config and db are initialized
  const bulkUploadLog = require('./bulk-upload-log');
  const roles = require('./roles');
  const tokenLogin = require('./token-login');
  const users = require('./users');

  return {
    bulkUploadLog,
    roles,
    tokenLogin,
    users
  };
};

