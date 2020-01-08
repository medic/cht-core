const settingsService = require('../services/settings');
const {promisify} = require('util');

module.exports = {
  name: 'convert-permissions-array-to-object',
  created: new Date(2018, 10, 30),
  run: promisify(function(callback) {
    settingsService.get()
      .then(settings => {
        if (Array.isArray(settings.permissions)) {
          const permissions = {};
          settings.permissions.forEach(function(permission){ 
            permissions[permission.name] = permission.roles; 
          });
          settings.permissions = permissions;
          
          return settingsService.update(settings, true);
        }
      })
      .then(() => callback())
      .catch(callback);
  })
};
