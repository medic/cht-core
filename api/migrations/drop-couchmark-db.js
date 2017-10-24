var db = require('../db');

module.exports = {
  name: 'drop-couchmark-db',
  created: new Date(2000, 1, 1), // really early so it runs first
  run: function(callback) {
    db.db.destroy('couchmark', function(err) {
      if (err && err.statusCode === 404) {
        // couchmark db not found - all good
        return callback();
      }
      return callback(err);
    });
  }
};
