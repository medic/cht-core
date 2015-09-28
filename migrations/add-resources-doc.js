var db = require('../db');

module.exports = {
  name: 'add-resources-doc',
  created: new Date(2015, 9, 25, 16, 0, 0, 0),
  run: function(callback) {
    db.medic.insert({ _id: 'resources', resources: {} }, callback);
  }
};