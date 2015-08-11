var async = require('async'),
    _ = require('underscore'),
    db = require('../db');

var fieldsToIncludeInBoth = [ '_id', 'name', 'facility_id' ];
var fieldsToOmitFromSettings = [ '_rev', 'salt', 'derived_key', 'password_scheme', 'iterations', 'roles', 'type' ];
var fieldsToIncludeInUser = fieldsToOmitFromSettings.concat(fieldsToIncludeInBoth);

var updateUser = function(row, callback) {
  var user = _.pick(row.doc, fieldsToIncludeInUser);
  db._users.insert(user, callback);
};

var splitUser = function(row, callback) {
  var settings = _.omit(row.doc, fieldsToOmitFromSettings);
  settings.type = 'user-settings';
  db.medic.insert(settings, function(err) {
    if (err) {
      return callback(err);
    }
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
      async.each(filterResults(result.rows), splitUser, callback);
    });
  }
};