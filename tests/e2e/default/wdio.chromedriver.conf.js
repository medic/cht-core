const wdioBaseConfig = require('../wdio.conf');
const { suites } = require('./suites');

const defaultMinimumBrowserConfig = Object.assign(wdioBaseConfig.config, {
  suites,
  specs: ['**/*.wdio-spec.js'],
  capabilities: [{
    maxInstances: 1,
    browserName: 'chrome',
    browserVersion: '90.0.4430.72',
    acceptInsecureCerts: true,
    'goog:chromeOptions': {
      args: ['headless', 'disable-gpu', 'deny-permission-prompts', 'ignore-certificate-errors', 'no-sandbox',
        'window-size=1200,900'],
      binary: '/usr/bin/google-chrome-stable'
    }
  }],
  services: ['chromedriver'],
});

exports.config = defaultMinimumBrowserConfig;

