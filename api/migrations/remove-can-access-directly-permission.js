var db = require('../db-pouch').medic;

module.exports = {
  name: 'remove-can-access-directly-permission',
  created: new Date(2018, 3, 27),
  run: function(callback) {
    db.get('_design/medic')
      .then(ddoc => {
        if(ddoc.app_settings.permissions) {
          ddoc.app_settings.permissions = ddoc.app_settings.permissions.filter(p => p.name !== 'can_access_directly');
          return db.put(ddoc);
        }
      })
      .then(() => callback())
      .catch(callback);
  },
};
