const wdioBaseConfig = require('../wdio.conf');
const { suites } = require('./suites');

const defaultMinimumBrowserConfig = Object.assign(wdioBaseConfig.config, {
  suites,
  specs: ['../default/**/*.wdio-spec.js'],
  capabilities: [{
    maxInstances: 1,
    browserName: 'chrome',
    browserVersion: '90.0.4430.72',
    acceptInsecureCerts: true,
    'goog:chromeOptions': {
      args: ['headless', 'disable-gpu', 'deny-permission-prompts', 'ignore-certificate-errors'],
      binary: '/Applications/Google Chrome 90.app/Contents/MacOS/Google Chrome'
    }
  }],
  services: ['chromedriver'],
});

exports.config = defaultMinimumBrowserConfig;
