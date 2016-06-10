var async = require('async'),
    _ = require('underscore'),
    db = require('../db');

var fieldsToIncludeInBoth = [ '_id', 'name', 'facility_id', 'roles' ];
var fieldsToOmitFromSettings = [ '_rev', 'salt', 'derived_key', 'password_scheme', 'iterations', 'type' ];
var fieldsToIncludeInUser = fieldsToOmitFromSettings.concat(fieldsToIncludeInBoth);

var updateUser = function(row, callback) {
  var user = _.pick(row.doc, fieldsToIncludeInUser);
  console.log('inserting _user', user);
  db._users.insert(user, callback);
};

var migrateUser = function(row, callback) {
  console.log('migrating user', row.doc._id);
  db.medic.get(row.doc._id, function(err) {
    if (!err) {
      // Doc already exists, no need to migrate.
      return callback();
    }
    if (row.doc._id === row.doc._id.toLowerCase()) {
      return splitUser(row, callback);
    }
    // Uppercase in the login! Change it to lowercase.
    var lowercaseId = row.doc._id.toLowerCase();
    db._users.get(lowercaseId, function(err) {
      if (!err || err.error !== 'not_found') {
        // Existing user called lowercase. Conflict!
        return callback(new Error('Cannot create lowercase username ' + lowercase + ', user already exists.'));
      }
      var uppercaseUser = _.pick(row.doc, fieldsToIncludeInUser);
      row.doc._id = lowercaseId;
      row.doc.name = row.doc.name.toLowerCase();
      delete row.doc._rev;
      return splitUser(row, function(err) {
        if (err) {
          return callback(err);
        }
        console.log('inserted _user');
        uppercaseUser._deleted = true;
        console.log('inserting _user', uppercaseUser);
        db._users.insert(uppercaseUser, callback);
      });
    });
  });
};

var splitUser = function(row, callback) {
  var settings = _.omit(row.doc, fieldsToOmitFromSettings);
  settings.type = 'user-settings';
  // Convert string value to boolean value, otherwise validate_doc_update will reject.
  if (settings.known === 'true') {
    settings.known = true;
  }
  console.log('inserting user-settings', settings);
  db.medic.insert(settings, function(err) {
    if (err) {
      return callback(err);
    }
    console.log('inserted user-settings');
    updateUser(row, callback);
  });
};

var filterResults = function(rows) {
  return _.filter(rows, function(row) {
    return row.id.indexOf('org.couchdb.user:') === 0;
  });
};

module.exports = {
  name: 'extract-user-settings',
  created: new Date(2015, 7, 29, 9, 50, 0, 0),
  run: function(callback) {
    db._users.list({ include_docs: true }, function(err, result) {
      if (err) {
        return callback(err);
      }
      // Run only one at a time, in case there are duplicate uppercase vs lowercase users.
      async.eachSeries(filterResults(result.rows), migrateUser, callback);
    });
  }
};
