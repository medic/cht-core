const wdioBaseConfig = require('../wdio.conf');
const utils = require('@utils');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const chtConfUtils = require('@utils/cht-conf');

const chai = require('chai');
chai.use(require('chai-exclude'));

// Override specific properties from wdio base config
const standardMinimumBrowserConfig = Object.assign(wdioBaseConfig.config, {
  suites: {
    all: [
      './**/*.wdio-spec.js'
    ]
  },
  capabilities: [{
    maxInstances: 1,
    browserName: 'chrome',
    browserVersion: '90.0.4430.72',
    acceptInsecureCerts: true,
    'goog:chromeOptions': {
      args: ['headless', 'disable-gpu', 'deny-permission-prompts', 'ignore-certificate-errors', 'no-sandbox'],
      binary: '/usr/bin/google-chrome-stable'
    }
  }],
  services: ['chromedriver'],
  onPrepare: async function () {
    await utils.prepServices();
    await uploadStandardConfig();
  },
});

const uploadStandardConfig = async () => {
  const standardConfigPath = 'config/standard';
  await exec('npm ci', { cwd: standardConfigPath });

  try {
    await chtConfUtils.runCommand('', standardConfigPath);
  } catch (err) {
    console.error(err);
  }
};

exports.config = standardMinimumBrowserConfig;
