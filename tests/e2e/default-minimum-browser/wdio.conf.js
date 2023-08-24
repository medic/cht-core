const wdioBaseConfig = require('../wdio.conf');
const { suites } = require('../default/suites');

// Override specific properties from wdio base config
const defaultMinimumBrowserConfig = Object.assign(wdioBaseConfig.config, {
  suites,
  specs: ['../default/**/*.wdio-spec.js'],
  capabilities: [{

    // maxInstances can get overwritten per capability. So if you have an in-house Selenium
    // grid with only 5 firefox instances available you can make sure that not more than
    // 5 instances get started at a time.
    maxInstances: 1,
    //
    browserName: 'chrome',
    browserVersion: '90.0.4430.72',
    acceptInsecureCerts: true,
    'goog:chromeOptions': {
      args: ['headless', 'disable-gpu', 'deny-permission-prompts', 'ignore-certificate-errors'],
      binary: '/Applications/Google Chrome 90.app/Contents/MacOS/Google Chrome'
    }
  }],
  services: ['chromedriver'],

});

exports.config = defaultMinimumBrowserConfig;
