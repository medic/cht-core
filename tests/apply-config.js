const constants = require('./constants');
const medicConf = require('medic-conf');

const CHT_URL = `${constants.BASE_URL_AUTH}/${constants.DB_NAME}`;

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
  defaultActions.forEach(async function(action) {
    const args = action === 'compile-app-settings' ? ['--noDependencyCheck'] : '';
    await medicConf(action, CHT_URL, args, path);
  });

  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 5000);
  });
};

module.exports = applyConfig;
