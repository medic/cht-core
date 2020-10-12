//const constants = require('./constants');
const mobileConfig = require('./conf').config;
mobileConfig.suites = {
  mobile: 'mobile/**/*.js'
};
mobileConfig.capabilities.chromeOptions = {
  w3c: false,
  args: ['--headless', '--disable-gpu'],
  mobileEmulation: {
    //'deviceName': constants.EMULATED_DEVICE,
    'deviceMetrics': {
      'width': 414,
      'height': 736,
      'pixelRatio': 3.0
    }
  }
};


exports.config = mobileConfig;
