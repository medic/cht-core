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
      './**/*.wdio-spec.js'
    ]
  },

  onPrepare: async function () {
    await utils.prepServices();
    await uploadStandardConfig();
  },
});

const uploadStandardConfig = async () => {
  const standardConfigPath = 'config/standard';
  await exec('npm ci', { cwd: standardConfigPath });

  try {
    await chtConfUtils.runCommand('',  standardConfigPath);
  } catch (err) {
    console.error(err);
  }
};

exports.config = standardConfig;
