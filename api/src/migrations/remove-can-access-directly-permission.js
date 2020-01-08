const settingsService = require('../services/settings');
const {promisify} = require('util');

module.exports = {
  name: 'remove-can-access-directly-permission',
  created: new Date(2018, 3, 27),
  run: promisify(function(callback) {
    settingsService.get()
      .then(settings => {
        if (Array.isArray(settings.permissions)) {
          settings.permissions = settings.permissions.filter(p => p.name !== 'can_access_directly');
        } else {
          delete settings.permissions.can_access_directly;
        }
        return settingsService.update(settings);
      })
      .then(() => callback())
      .catch(callback);
  })
};
