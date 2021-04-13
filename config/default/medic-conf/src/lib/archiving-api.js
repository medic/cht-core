const archiveDocToFile = require('./archive-doc-to-file');
const environment = require('./environment');

const archivingApi = {
  updateAppSettings: (content) => {
    archiveDocToFile(environment.archiveDestination, 'settings', content);
    return Promise.resolve('{ "success": true }');
  },

  version() {
    return '1000.0.0'; // assume the latest version when archiving
  },
};

module.exports = archivingApi;
