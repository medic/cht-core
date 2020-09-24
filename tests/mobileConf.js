const conf =require('./conf');
var config = conf.config;

config.capabilities.chromeOptions= {
    w3c: false,
    //args: ['--headless', '--disable-gpu'],
    //mobileEmulation: {'deviceName': 'Nexus 5'}
};


exports.config = config;
