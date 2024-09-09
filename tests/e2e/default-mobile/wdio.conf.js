const wdioBaseConfig = require('../../wdio.conf');

const chai = require('chai');
chai.use(require('chai-exclude'));

// Override specific properties from wdio base config
exports.config = Object.assign(wdioBaseConfig.config, {
  suites: {
    all: [
      // '**/old-navigation.wdio-spec.js', this is now failing and should be investigated

      // '**/reports/*.wdio-spec.js'
      '../default-mobile/browser-compatibility/*.wdio-spec.js',
      '../default-mobile/contacts/*.wdio-spec.js',
      '../default-mobile/navigation/*.wdio-spec.js',
      '../default-mobile/reports/*.wdio-spec.js',
      '../default-mobile/upgrade/*.wdio-spec.js',
      '../default-mobile/content-security-policy.wdio-spec.js',

      /*'./!**!/!*.wdio-spec.js',
      '../default/login/login-logout.wdio-spec.js',
      '../default/navigation/navigation.wdio-spec.js',
      '../default/navigation/hamburger-menu.wdio-spec.js',*/
    ]
  },
  beforeSuite: async () => {
    // We tried the browser.emulateDevice('...') function but it's not stable enough,
    // it looses the mobile view and switches back to desktop
    await browser.setWindowSize(450, 700);
  },
});
