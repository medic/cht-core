const wdioBaseConfig = require('../wdio.conf');
const { suites } = require('./suites');
const BROWSERSTACK_USER = process.env.DEBUG;
const BROWSERSTACK_KEY = process.env.DEBUG;

const browserStackConfig = Object.assign(wdioBaseConfig.config, {
  //suites,
  specs: ['../default/default/about/about.wdio-spec.js'],

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
        buildName: 'bstack-demo',
        buildIdentifier: '${BUILD_NUMBER}',
        projectName: 'BrowserStack Sample',
        debug: 'true',
        networkLogs: 'true',
        consoleLogs: 'info'
      }
    }
  ],
  services: [['browserstack', {
    browserstackLocal: true
  }]]

});

exports.config = browserStackConfig;


