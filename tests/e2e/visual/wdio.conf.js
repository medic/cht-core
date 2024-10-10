const wdioBaseConfig = require('../../wdio.conf');

const chai = require('chai');
chai.use(require('chai-exclude'));

const mobileCapability = {
  ...wdioBaseConfig.config.capabilities[0],
  'goog:chromeOptions': {
    ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'],
    args: [
      ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'].args,
      'window-size=450,700',
    ],
  },
  isMobile: true,
};

const desktopCapability = {
  ...wdioBaseConfig.config.capabilities[0],
  'goog:chromeOptions': {
    ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'],
    args: [
      ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'].args,
      'window-size=2880, 2048',
    ],
  },
  isMobile: false,
};

exports.config = Object.assign(wdioBaseConfig.config, {
  specs: ['**/*.wdio-spec.js'],
  suites: {
    desktopTests: [
      'contacts/contact-user-hierarchy-creation.wdio-spec.js',
      'contacts/contact-user-management.wdio-spec.js',
    ],
    mobileTests: [
      'contacts/contact-user-management.wdio-spec.js',
      'contacts/list-view-login-visual.wdio-spec.js',
    ]
  },
  capabilities: [],
  maxInstances: 1,
});
