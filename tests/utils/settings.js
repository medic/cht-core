const utils = require('../utils');

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
  setupSettings
};
