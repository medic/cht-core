const wdioBaseConfig = require('../../wdio.conf');
const { resizeWindowForScreenshots } = require('@utils/screenshots');

const chai = require('chai');
chai.use(require('chai-exclude'));

const mobileCapability = {
  ...wdioBaseConfig.config.capabilities[0],
  'goog:chromeOptions': {
    ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'],
    args: [
      ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'].args,
      'window-size=375,850',
    ],
  }
};

const desktopCapability = {
  ...wdioBaseConfig.config.capabilities[0],
  'goog:chromeOptions': {
    ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'],
    args: [
      ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'].args,
      'window-size=1440, 1024',
    ],
  }
};

exports.config = Object.assign(wdioBaseConfig.config, {
  suites: {
    desktopTests: [
      'contacts/contact-user-management.wdio-spec.js',
      'contacts/contact-user-hierarchy-creation.wdio-spec.js',
      'targets/targets-overview.wdio-spec.js',
      'reports/bulk-delete.wdio-spec.js',
      'reports/report-action-bar.wdio-spec.js',
    ],
    mobileTests: [
      'contacts/contact-user-management.wdio-spec.js',
      'contacts/list-view-login-visual.wdio-spec.js',
      'targets/targets-overview.wdio-spec.js',
      'reports/bulk-delete.wdio-spec.js',
      'reports/report-action-bar.wdio-spec.js',
    ]
  },
  capabilities: process.argv.includes('--suite=mobileTests')
    ? [mobileCapability]
    : [desktopCapability],
  maxInstances: 1,
  beforeSuite: async function () {
    await resizeWindowForScreenshots();
  },
});
