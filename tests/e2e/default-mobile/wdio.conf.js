const wdioBaseConfig = require('../default/wdio.conf');

const chai = require('chai');
chai.use(require('chai-exclude'));

// Override specific properties from wdio base config
exports.config = Object.assign(wdioBaseConfig.config, {
  specs: [
    './tests/e2e/default-mobile/**/*.wdio-spec.js'
  ],
  beforeSuite: async () => {
    // We tried the browser.emulateDevice('...') function but it's not stable enough,
    // it looses the mobile view and switches back to desktop
    await browser.setWindowSize(450, 700);
  },
});
