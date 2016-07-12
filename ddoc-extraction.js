var async = require('async'),
    _ = require('underscore'),
    db = require('./db'),
    DDOC_ATTACHMENT_ID = '_design/medic/ddocs/compiled.json',
    CLIENT_DDOC_ID = '_design/medic-client';

var getSettings = function(callback) {
  db.medic.get('_design/medic', function(err, ddoc) {
    if (err) {
      return callback(err);
    }
    callback(null, ddoc.app_settings);
  });
};

var getCompiledDdocs = function(callback) {
  db.medic.get(DDOC_ATTACHMENT_ID, function(err, ddocs) {
    if (err) {
      if (err.error === 'not_found') {
        return callback(null, []);
      }
      return callback(err);
    }
    callback(null, ddocs.docs);
  });
};

var updateIfRequired = function(settings, ddoc, callback) {
  db.medic.get(ddoc._id, function(err, oldDdoc) {
    if (err && err.error !== 'not_found') {
      return callback(err);
    }
    ddoc._rev = oldDdoc && oldDdoc._rev;
    if (ddoc._id === CLIENT_DDOC_ID) {
      ddoc.app_settings = settings;
    }
    if (oldDdoc && _.isEqual(ddoc, oldDdoc)) {
      // unmodified
      return callback();
    }
    console.log('Updating ddoc ' + ddoc._id);
    db.medic.insert(ddoc, callback);
  });
};

var updateAll = function(ddocs, callback) {
  getSettings(function(err, settings) {
    if (err) {
      return callback(err);
    }
    async.each(ddocs, function(ddoc, cb) {
      updateIfRequired(settings, ddoc, cb);
    }, callback);
  });
};

module.exports = {
  run: function(callback) {
    getCompiledDdocs(function(err, ddocs) {
      if (err) {
        return callback(err);
      }
      if (!ddocs.length) {
        return callback();
      }
      updateAll(ddocs, callback);
    });
  }
};
