const environment = require('../lib/environment');
const fetchFilesFromGoogleDrive = require('../lib/fetch-files-from-google-drive');

module.exports = {
  requiresInstance: false,
  execute: async () => {
    await fetchFilesFromGoogleDrive(
        `${environment.pathToProject}/forms-on-google-drive.json`,
        `${environment.pathToProject}/forms`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
};
