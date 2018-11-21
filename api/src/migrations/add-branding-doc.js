var db = require('../db-nano'),
    {promisify} = require('util'),
    appTitle = 'Medic Mobile';

var RESOURCES_ID = 'branding';

module.exports = {
  name: 'add-branding-doc',
  created: new Date(2015, 9, 25, 16, 0, 0, 0),
  run: promisify(function(callback) {
    db.medic.get(RESOURCES_ID, function(err) {
      if (err) {
        if (err.statusCode === 404) {
          db.medic.insert({ _id: RESOURCES_ID, resources: {}, title: appTitle }, callback);
        } else {
          callback(err);
        }
      } else {
        callback();
      }
    });
  })
};
