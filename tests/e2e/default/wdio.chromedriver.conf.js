const wdioBaseConfig = require('../wdio.conf');
//const { suites } = require('./suites');

const defaultMinimumBrowserConfig = Object.assign(wdioBaseConfig.config, {
  //suites,
  specs: ['tests/e2e/default/login/login-logout.wdio-spec.js'],
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
});

exports.config = defaultMinimumBrowserConfig;
