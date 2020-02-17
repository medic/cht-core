const async = require('async');
const {promisify} = require('util');
const _ = require('lodash');
const db = require('../db');

const fieldsToIncludeInBoth = [ '_id', 'name', 'facility_id', 'roles' ];
const fieldsToOmitFromSettings = [ '_rev', 'salt', 'derived_key', 'password_scheme', 'iterations', 'type' ];
const fieldsToIncludeInUser = fieldsToOmitFromSettings.concat(fieldsToIncludeInBoth);

const updateUser = function(row, callback) {
  const user = _.pick(row.doc, fieldsToIncludeInUser);
  db.users.put(user, callback);
};

const migrateUser = function(row, callback) {
  db.medic.get(row.doc._id, function(err) {
    if (!err) {
      // Doc already exists, no need to migrate.
      return callback();
    }
    if (row.doc._id === row.doc._id.toLowerCase()) {
      return splitUser(row, callback);
    }
    // Uppercase in the login! Change it to lowercase.
    const lowercaseId = row.doc._id.toLowerCase();
    db.users.get(lowercaseId, function(err) {
      if (!err || err.error !== 'not_found') {
        // Existing user called lowercase. Conflict!
        return callback(new Error('Cannot create lowercase username ' + lowercaseId + ', user already exists.'));
      }
      const uppercaseUser = _.pick(row.doc, fieldsToIncludeInUser);
      row.doc._id = lowercaseId;
      row.doc.name = row.doc.name.toLowerCase();
      delete row.doc._rev;
      return splitUser(row, function(err) {
        if (err) {
          return callback(err);
        }
        uppercaseUser._deleted = true;
        db.users.put(uppercaseUser, callback);
      });
    });
  });
};

const splitUser = function(row, callback) {
  const settings = _.omit(row.doc, fieldsToOmitFromSettings);
  settings.type = 'user-settings';
  // Convert string value to boolean value, otherwise validate_doc_update will reject.
  if (settings.known === 'true') {
    settings.known = true;
  }
  db.medic.put(settings, function(err) {
    if (err) {
      return callback(err);
    }
    updateUser(row, callback);
  });
};

const filterResults = function(rows) {
  return _.filter(rows, function(row) {
    return row.id.indexOf('org.couchdb.user:') === 0;
  });
};

module.exports = {
  name: 'extract-user-settings',
  created: new Date(2015, 7, 29, 9, 50, 0, 0),
  run: promisify(function(callback) {
    db.users.allDocs({ include_docs: true }, function(err, result) {
      if (err) {
        return callback(err);
      }
      // Run only one at a time, in case there are duplicate uppercase vs lowercase users.
      async.eachSeries(filterResults(result.rows), migrateUser, callback);
    });
  })
};
