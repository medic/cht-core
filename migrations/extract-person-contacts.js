var async = require('async'),
    db = require('../db');

var extract = function(row, callback) {
  db.medic.get(row.id, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        return callback();
      }
      return callback(err);
    }
    if (!doc.contact) {
      // no contact to migrate
      return callback();
    }
    if (doc.contact._id) {
      // already migrated
      return callback();
    }
    db.medic.insert({
      type: 'person',
      name: doc.contact.name,
      phone: doc.contact.phone
    }, function(err, result) {
      if (err) {
        return callback(err);
      }
      doc.contact.type = 'person';
      doc.contact._id = result.id;
      doc.contact._rev = result.rev;
      db.medic.insert(doc, callback);
    });
  });
};

module.exports = {
  name: 'extract-person-contacts',
  created: new Date(2015, 3, 16, 17, 6, 0, 0),
  run: function(callback) {
    db.medic.view('medic', 'facilities', { }, function(err, result) {
      if (err) {
        return callback(err);
      }
      async.eachSeries(result.rows, extract, callback);
    });
  }
};