var settingsService = require('../services/settings');

module.exports = {
  name: 'remove-can-access-directly-permission',
  created: new Date(2018, 3, 27),
  run: function(callback) {
    settingsService.get()
      .then(settings => {
        settings.permissions = settings.permissions.filter(p => p.name !== 'can_access_directly');
        return settingsService.update(settings);
      })
      .then(() => callback())
      .catch(callback);
  },
};
