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
};

const desktopCapability = {
  ...wdioBaseConfig.config.capabilities[0],
  'goog:chromeOptions': {
    ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'],
    args: [
      ...wdioBaseConfig.config.capabilities[0]['goog:chromeOptions'].args,
      'window-size=1000,800',
    ],
  },
};

exports.config = Object.assign(wdioBaseConfig.config, {
  suites: {
    all: [
      './**/*.wdio-spec.js',
    ]
  },
  capabilities: [mobileCapability,desktopCapability],
  maxInstances: 1,
});
