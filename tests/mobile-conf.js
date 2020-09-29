const constants = require('./constants');
const mobileConfig = require('./conf').config;
mobileConfig.capabilities.chromeOptions = {
    w3c: false,
    args: ['--headless', '--disable-gpu'],
    mobileEmulation: {
        'deviceName': constants.EMULATED_DEVICE,
        //To emulate a device that ChromeDriver doesn’t know of,
        //enable Mobile Emulation using individual device metrics
        /*'deviceMetrics': {
                'width': 384,
                'height': 640,
                'pixelRatio': 2.0
            }*/
    }
};


exports.config = mobileConfig;
