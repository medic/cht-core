const checkForUpdates = require('../lib/check-for-updates');

module.exports = {
  requiresInstance: false,
  execute: () => checkForUpdates()
};
