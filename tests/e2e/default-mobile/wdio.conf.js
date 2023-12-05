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
      args: DEBUG ? ['disable-gpu', 'deny-permission-prompts', 'ignore-certificate-errors', 'use-mobile-user-agent'] :
        ['headless', 'disable-gpu', 'deny-permission-prompts', 'ignore-certificate-errors', 'use-mobile-user-agent'],
      mobileEmulation: {
        'deviceMetrics': {
          'mobile': true,
          'touch': true,
          'width': 600,
          'height': 960,
          'pixelRatio': 1.75
        },
        'clientHints': {
          'brands': [
            { 'brand': 'Google Chrome', 'version': '119' },
            { 'brand': 'Chromium', 'version': '119' }
          ],
          'fullVersionList': [
            { 'brand': 'Google Chrome', 'version': '119.0.6045.159' },
            { 'brand': 'Chromium', 'version': '119.0.6045.159' }
          ],
          'platform': 'Android',
          'platformVersion': '11',
          'architecture': 'arm',
          'model': 'lorem ipsum (2022)',
          'mobile': true,
          'bitness': '32',
          'wow64': false
        }
      },
    }
  }]
});
