const wdioBaseConfig = require('../wdio.conf');

const chai = require('chai');
chai.use(require('chai-exclude'));
const DEBUG = process.env.DEBUG;

// Override specific properties from wdio base config
exports.config = Object.assign(wdioBaseConfig.config, {
  suites: {
    all: [
      './**/*.wdio-spec.js',
      [
        '../default/login/login-logout.wdio-spec.js',
        '../default/navigation/navigation.wdio-spec.js',
        '../default/navigation/hamburger-menu.wdio-spec.js',
      ],
    ]
  },
  capabilities: [{
    maxInstances: 1,
    browserName: 'chrome',
    acceptInsecureCerts: true,
    'goog:chromeOptions': {
      args: DEBUG ? ['disable-gpu', 'deny-permission-prompts', 'ignore-certificate-errors'] :
        ['headless', 'disable-gpu', 'deny-permission-prompts', 'ignore-certificate-errors'],
      mobileEmulation: {
        'deviceName': 'Galaxy S5'
      },
    }
  }]
});
