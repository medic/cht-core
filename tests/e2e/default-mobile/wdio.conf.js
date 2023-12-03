const wdioBaseConfig = require('../wdio.conf');

const chai = require('chai');
chai.use(require('chai-exclude'));

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
  beforeSuite: async () => {
    // We tried the browser.emulateDevice('...') function but it's not stable enough,
    // it looses the mobile view and switches back to desktop.
    // Adding to the comment above, it loses the mobile view when a test fails.
    // It may be better to use beforeHook instead of beforeSuite so it can set the capability before each test.
    await browser.emulateDevice({
      viewport: {
        width: 600,
        height: 960,
        isMobile: true,
        hasTouch: true,
      },
      userAgent: `Mozilla/5.0 (Linux; Android ${ANDROID_VERSION}; IN2010) AppleWebKit/537.36 (KHTML, like Gecko) ` +
        `Chrome/${MOBILE_CHROME_VERSION} Mobile Safari/537.36`
    });
  },
});
