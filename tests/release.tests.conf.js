const BaseConfig = require('./base.conf.js');
const applyConfig = require('./apply-config');
console.log(__dirname);
const pathToStandardConfig = __dirname + '/../config/standard';
let baseConfig = new BaseConfig('e2e/release', { headless:false }, pathToStandardConfig);
baseConfig.SELENIUM_PROMISE_MANAGER = false;

module.exports = baseConfig;
