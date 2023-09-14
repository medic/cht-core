const wdioBaseConfig = require('../wdio.conf');

const defaultMinimumBrowserConfig = Object.assign(wdioBaseConfig.config, {
  specs: ['/Users/marialorenarodriguezviruel/medic-workspace/cht-core/tests/e2e/default/admin/admin-access.wdio-spec.js'],
  capabilities: [{
    maxInstances: 1,
    browserName: 'chrome',
    browserVersion: '90.0.4430.72',
    acceptInsecureCerts: true,
    'goog:chromeOptions': {
      args: ['headless', 'disable-gpu', 'deny-permission-prompts', 'ignore-certificate-errors'],
      binary: '/usr/bin/google-chrome-stable'
    }
  }],
  services: ['chromedriver'],
});

exports.config = defaultMinimumBrowserConfig;
