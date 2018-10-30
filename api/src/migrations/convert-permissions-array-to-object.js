var settingsService = require('../services/settings'),
    {promisify} = require('util');

module.exports = {
  name: 'convert-permissions-array-to-object',
  created: new Date(2018, 10, 30),
  run: promisify(function(callback) {
    settingsService.get()
      .then(settings => {
        var permissions = {};
        settings.permissions.forEach(function(permission){ 
          permissions[permission.name] = permission.roles; 
        });
        settings.permissions = permissions;
        return settingsService.update(settings);
      })
      .then(() => callback())
      .catch(callback);
  })
};
