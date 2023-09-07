const wdioBaseConfig = require('../wdio.conf');
const { suites } = require('./suites');
const BROWSERSTACK_USER = process.env.BROWSERSTACK_USERNAME;
const BROWSERSTACK_KEY = process.env.BROWSERSTACK_ACCESS_KEY;

const browserStackConfig = Object.assign(wdioBaseConfig.config, {
  suites,
  specs: ['../default/**/*.wdio-spec.js'],
  user: BROWSERSTACK_USER,
  key: BROWSERSTACK_KEY,
  hostname: 'hub.browserstack.com',

  capabilities: [
    {
      maxInstances: 1,
      acceptInsecureCerts: true,
      browserName: 'Chrome',
      'bstack:options': {
        browserVersion: '90.0',
        os: 'Windows',
        osVersion: '10',
        buildName: '${BRANCH}',
        buildIdentifier: '${BUILD_NUMBER}',
        projectName: 'Chrome v90',
        consoleLogs: 'info'
      }
    }
  ],
  services: [['browserstack', {
    browserstackLocal: true
  }]]

});

exports.config = browserStackConfig;


