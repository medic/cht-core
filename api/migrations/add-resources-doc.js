var db = require('../db');

var RESOURCES_ID = 'resources';

module.exports = {
  name: 'add-resources-doc',
  created: new Date(2015, 9, 25, 16, 0, 0, 0),
  run: function(callback) {
    db.medic.get(RESOURCES_ID, function(err) {
      if (err) {
        if (err.statusCode === 404) {
          db.medic.insert({ _id: RESOURCES_ID, resources: {} }, callback);
        } else {
          callback(err);
        }
      } else {
        callback();
      }
    });
  }
};
