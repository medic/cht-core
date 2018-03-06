const serviceManager = require('./service-manager');
const BaseConfig = require('./base.conf.js');

const testsAndServicesConfig = new BaseConfig();

testsAndServicesConfig.onCleanUp = serviceManager.stopAll;
testsAndServicesConfig.beforePrepareWebapp = () => {
  browser.driver.wait(serviceManager.startAll(), 60 * 1000, 'API and Sentinel should start within 60 seconds');
  browser.driver.sleep(1); // block until previous command has completed
};

module.exports = testsAndServicesConfig;
