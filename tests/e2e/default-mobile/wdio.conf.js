const wdioBaseConfig = require('../wdio.conf');

const chai = require('chai');
chai.use(require('chai-exclude'));
const DEBUG = process.env.DEBUG;
const ANDROID_VERSION = '13';
const MOBILE_CHROME_VERSION = '118.0.5993.112';

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
        userAgent: `Mozilla/5.0 (Linux; Android ${ANDROID_VERSION}; IN2010) AppleWebKit/537.36 (KHTML, like Gecko) ` +
          `Chrome/${MOBILE_CHROME_VERSION} Mobile Safari/537.36`,
        deviceMetrics: {
          'mobile': true,
          'touch': true,
          'width': 600,
          'height': 960
        },
      },
    }
  }]
});
