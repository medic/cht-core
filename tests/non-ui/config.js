const request = require('request-promise-native');
const utils = require('../utils');
const constants = require('../constants');
const runAndLog = (msg, func) => {
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
  } catch(err) {
    console.log('API check failed, trying again in 1 second');
    console.log(err.message);
    await apiRetry();
  }
};
module.exports = {
  startServices :async () => {
    if (constants.IS_TRAVIS) {
      console.log('On travis, waiting for horti to first boot api');
      // Travis' horti will be installing and then deploying api and sentinel, and those logs are
      // getting pushed into horti.log Once horti has bootstrapped we want to restart everything so
      // that the service processes get restarted with their logs separated and pointing to the
      // correct logs for testing
      await listenForApi();
      console.log('Horti booted API, rebooting under our logging structure');
      await request.post('http://localhost:31337/all/restart');
    } else {
      // Locally we just need to start them and can do so straight away
      await request.post('http://localhost:31337/all/start');
    }

    await listenForApi();
    await runAndLog('User contact doc setup', utils.setUserContactDoc);
  },

  stopServices :async () => {
    await request.post('http://localhost:31337/die');
  }
};
