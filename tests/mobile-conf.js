const mobileConfig = require('./conf').config;
mobileConfig.suites = {
  mobile: 'mobile/**/*.js'
};
mobileConfig.capabilities.chromeOptions = {
  w3c: false,
  args: ['--headless', '--disable-gpu'],
  mobileEmulation: {
    //To emulate a device that ChromeDriver doesn’t know of,
    //enable Mobile Emulation using individual device metrics
    'deviceMetrics': {
      'width': 384,
      'height': 640,
      'pixelRatio': 2.0
    }
  }
};


exports.config = mobileConfig;
