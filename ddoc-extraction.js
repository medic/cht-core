var async = require('async'),
    _ = require('underscore'),
    db = require('./db'),
    DDOC_ATTACHMENT_ID = '_design/medic/ddocs/compiled.json',
    APPCACHE_ATTACHMENT_NAME = 'static/dist/manifest.appcache',
    APPCACHE_DOC_ID = 'appcache',
    SERVER_DDOC_ID = '_design/medic',
    CLIENT_DDOC_ID = '_design/medic-client';

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

var isUpdated = function(settings, ddoc, callback) {
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
    callback(null, ddoc);
  });
};

var findUpdatedDdocs = function(settings, callback) {
  getCompiledDdocs(function(err, ddocs) {
    if (err) {
      return callback(err);
    }
    if (!ddocs.length) {
      return callback(null, []);
    }
    async.map(ddocs, function(ddoc, cb) {
      isUpdated(settings, ddoc, cb);
    }, function(err, updated) {
      if (err) {
        return callback(err);
      }
      callback(null, _.compact(updated));
    });
  });
};

var findUpdatedAppcache = function(ddoc, callback) {
  var attachment = ddoc._attachments && ddoc._attachments[APPCACHE_ATTACHMENT_NAME];
  var digest = attachment && attachment.digest;
  if (!digest) {
    return callback();
  }
  db.medic.get(APPCACHE_DOC_ID, function(err, doc) {
    if (err) {
      if (err.error === 'not_found') {
        // create new appcache doc
        return callback(null, {
          _id: APPCACHE_DOC_ID,
          digest: digest
        });
      }
      return callback(err);
    }
    if (doc.digest === digest) {
      // unchanged
      return callback();
    }
    doc.digest = digest;
    callback(null, doc);
  });
};

var findUpdated = function(ddoc, callback) {
  async.parallel([
    _.partial(findUpdatedDdocs, ddoc.app_settings),
    _.partial(findUpdatedAppcache, ddoc)
  ], function(err, results) {
    if (err) {
      return callback(err);
    }
    callback(null, _.compact(_.flatten(results)));
  });
};

module.exports = {
  run: function(callback) {
    db.medic.get(SERVER_DDOC_ID, function(err, ddoc) {
      if (err) {
        return callback(err);
      }
      findUpdated(ddoc, function(err, docs) {
        if (err) {
          return callback(err);
        }
        if (!docs.length) {
          return callback();
        }
        console.log('Updating docs: ' + _.pluck(docs, '_id'));
        db.medic.bulk({ docs: docs }, callback);
      });
    });
  }
};
