const environment = require('../lib/environment');
const uploadConfigurationDocs = require('../lib/upload-configuration-docs');

module.exports = {
  requiresInstance: true,
  execute: () => {
    const configurationPath = `${environment.pathToProject}/partners.json`;
    const directoryPath = `${environment.pathToProject}/partners`;

    return uploadConfigurationDocs(configurationPath, directoryPath, 'partners');
  }
};
