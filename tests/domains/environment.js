const utils = require('../utils');
const rpn = require('request-promise-native');
const constants = require('../constants');
const settings = require('./settings');

const runAndLogApiStartupMessage = (msg, func) => {
  console.log(`API startup: ${msg}`);
  return func();
};

const apiRetry = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(listenForApi());
    }, 1000);
  });
};

const listenForApi = async () => {
  console.log('Checking API');
  try {
    await utils.request({ path: '/api/info' });
    console.log('API is up');
  } catch (err) {
    console.log('API check failed, trying again in 1 second');
    console.log(err.message);
    await apiRetry();
  }
};

const prepServices = async (config) => {
  if (constants.IS_CI) {
    console.log('On CI, waiting for horti to first boot api');
    // CI' horti will be installing and then deploying api and sentinel, and those logs are
    // getting pushed into horti.log Once horti has bootstrapped we want to restart everything so
    // that the service processes get restarted with their logs separated and pointing to the
    // correct logs for testing
    await listenForApi();
    console.log('Horti booted API, rebooting under our logging structure');
    await rpn.post('http://localhost:31337/all/restart');
  } else {
    // Locally we just need to start them and can do so straight away
    await rpn.post('http://localhost:31337/all/start');
  }

  await listenForApi();
  if (config && config.suite === 'web') {
    await runAndLogApiStartupMessage('Settings setup', settings.setupSettings);
  }
  await runAndLogApiStartupMessage('User contact doc setup', utils.setUserContactDoc);
};

const tearDownServices = () => {
  return rpn.post('http://localhost:31337/die');
};


module.exports = {
  prepServices,
  tearDownServices,
  runAndLogApiStartupMessage
};
