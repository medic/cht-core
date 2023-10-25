const wdioBaseConfig = require('../wdio.conf');
const utils = require('@utils');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const chtConfUtils = require('@utils/cht-conf');

const chai = require('chai');
chai.use(require('chai-exclude'));

// Override specific properties from wdio base config
const standardConfig = Object.assign(wdioBaseConfig.config, {
  suites: {
    all: [
      './**/immu*.wdio-spec.js'
    ]
  },

  onPrepare: async function () {
    await utils.prepServices();
    await uploadStandardConfig();
  },
});

const uploadStandardConfig = async () => {
  const standardConfigPath = 'config/standard';
  console.log('Running npm ci config/standard');
  //await exec('npm ci', { cwd: standardConfigPath });

  try {
    console.log('Deploying config/standard');
    await chtConfUtils.runCommand('upload-app-settings delete-all-forms upload-app-forms upload-collect-forms upload-contact-forms upload-training-forms upload-resources upload-branding upload-partners upload-custom-translations upload-privacy-policies upload-extension-libs',  standardConfigPath);
  } catch (err) {
    console.error(err);
  }
};

exports.config = standardConfig;
