var settingsService = require('../services/settings'),
    {promisify} = require('util');

module.exports = {
  name: 'remove-can-access-directly-permission',
  created: new Date(2018, 3, 27),
  run: promisify(function(callback) {
    settingsService.get()
      .then(settings => {
        settings.permissions = settings.permissions.filter(p => p.name !== 'can_access_directly');
        return settingsService.update(settings);
      })
      .then(() => callback())
      .catch(callback);
  })
};
