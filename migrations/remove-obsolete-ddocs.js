var async = require('async'),
    db = require('../db'),
    DDOCS_TO_REMOVE = ['_design/kujua-sentinel', '_design/erlang_filters'];

module.exports = {
  name: 'remove-obsolete-ddocs',
  created: new Date(2016, 8, 2, 22, 0, 0, 0),
  run: function(callback) {
    async.each(DDOCS_TO_REMOVE, function(id, callback) {
      db.medic.get(id, function(err, ddoc) {
        if (err) {
          if (err.statusCode === 404) {
            return callback();
          }
          return callback(err);
        }
        ddoc._deleted = true;
        db.medic.insert(ddoc, callback);
      });
    }, callback);
  }
};
