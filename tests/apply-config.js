const constants = require('./constants');
const medicConf = require('medic-conf');

const defaultActions = [
  'compile-app-settings',
  'upload-app-settings',
  'convert-app-forms',
  'convert-collect-forms',
  'convert-contact-forms',
  'delete-all-forms',
  'upload-app-forms',
  'upload-collect-forms',
  'upload-contact-forms',
  'upload-resources',
  'upload-custom-translations'
];

const applyConfig = async path => {
  const couchUrl = `${constants.BASE_URL_AUTH}/${constants.DB_NAME}`;

  defaultActions.forEach(async function(action) {
    if (action === 'compile-app-settings') {
      await medicConf(action, couchUrl, ['--noDependencyCheck'], path);
    } else {
      await medicConf(action, couchUrl, '', path);
    }
  });

  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 5000);
  });
};

module.exports = applyConfig;
