const utils = require('../utils');
const rpn = require('request-promise-native');
const constants = require('./constants');

const prepServices = async (config) => {
  if (constants.IS_CI) {
    console.log('On CI, waiting for horti to first boot api');
    // CI' horti will be installing and then deploying api and sentinel, and those logs are
    // getting pushed into horti.log Once horti has bootstrapped we want to restart everything so
    // that the service processes get restarted with their logs separated and pointing to the
    // correct logs for testing
    await utils.listenForApi();
    console.log('Horti booted API, rebooting under our logging structure');
    await rpn.post('http://localhost:31337/all/restart');
  } else {
    // Locally we just need to start them and can do so straight away
    await rpn.post('http://localhost:31337/all/start');
  }

  await utils.listenForApi();
  if (config && config.suite === 'web') {
    await utils.runAndLogApiStartupMessage('Settings setup', setupSettings);
  }
  await utils.runAndLogApiStartupMessage('User contact doc setup', utils.setUserContactDoc);
};

const setupSettings = () => {
  const defaultAppSettings = utils.getDefaultSettings();
  defaultAppSettings.transitions = {};

  return utils.request({
    path: '/api/v1/settings?replace=1',
    method: 'PUT',
    body: defaultAppSettings
  });
};


module.exports = {
  prepServices
};
