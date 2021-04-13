const environment = require('../lib/environment');
const uploadConfigurationDocs = require('../lib/upload-configuration-docs');

const processJson = (json) => {
  return {
    resources: json
  };
};

module.exports = {
  requiresInstance: true,
  execute: () => {
    const configurationPath = `${environment.pathToProject}/resources.json`;
    const directoryPath = `${environment.pathToProject}/resources`;

    return uploadConfigurationDocs(configurationPath, directoryPath, 'resources', processJson);
  }
};
