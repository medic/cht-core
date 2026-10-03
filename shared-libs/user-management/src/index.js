const config = require('./libs/config');
const db = require('./libs/db');
const dataContext = require('./libs/data-context');
const lineage = require('./libs/lineage');
const bulkUploadLog = require('./bulk-upload-log');
const roles = require('./roles');
const tokenLogin = require('./token-login');
const users = require('./users');
const { isSsoLoginEnabled, getUsersByOidcUsername } = require('./sso-login');

const ssoLogin = {
  isSsoLoginEnabled,
  getUsersByOidcUsername,
};
module.exports = (sourceConfig, sourceDb, sourceDataContext) => {
  config.init(sourceConfig);
  db.init(sourceDb);
  dataContext.init(sourceDataContext);
  lineage.init(require('@medic/lineage')(Promise, db.medic));

  return {
    bulkUploadLog,
    roles,
    tokenLogin,
    ssoLogin,
    users,
    validatePassword: users.validatePassword,
  };
};

// Exposed off the entry point rather than reached for at `src/libs/`: `vaultKey` is pure and needs
// none of the init the factory above does, and the api has to build the exact same string to write
// the entries this clears.
module.exports.deviceKeys = require('./libs/device-keys');
