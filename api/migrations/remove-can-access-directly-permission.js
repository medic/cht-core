var db = require('../db-pouch').medic;

module.exports = {
  name: 'remove-can-access-directly-permission',
  created: new Date(2016, 11, 1),
  run: function(callback) {
    db.get('_design/medic')
      .then(ddoc => {
        if(ddoc.permissions) {
          ddoc.permissions =
              ddoc.permissions.filter(p => p.name !== 'can_access_directly');
          return db.save(ddoc);
        }
      })
      .then(() => callback())
      .catch(callback);
  },
};
