var async = require('async'),
    _ = require('underscore'),
    db = require('./db-nano'),
    DDOC_ATTACHMENT_ID = '_design/medic/ddocs/compiled.json',
    APPCACHE_ATTACHMENT_NAME = 'manifest.appcache',
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

var areAttachmentsEqual = (oldDdoc, newDdoc) => {
  if (!oldDdoc._attachments && !newDdoc._attachments) {
    // no attachments found
    return true;
  }
  if (!oldDdoc._attachments || !newDdoc._attachments) {
    // one ddoc has attachments and the other doesn't
    return false;
  }
  if (Object.keys(oldDdoc._attachments).length !== Object.keys(newDdoc._attachments).length) {
    // one ddoc has more attachments than the other
    return false;
  }
  // check all attachment data
  return Object.keys(oldDdoc._attachments).every(name => {
    return newDdoc._attachments[name] &&
           newDdoc._attachments[name].data === oldDdoc._attachments[name].data;
  });
};

var isUpdated = function(settings, newDdoc, callback) {
  db.medic.get(newDdoc._id, { attachments: true }, function(err, oldDdoc) {
    if (err && err.error !== 'not_found') {
      return callback(err);
    }
    // set the rev so we can update if necessary
    newDdoc._rev = oldDdoc && oldDdoc._rev;
    if (newDdoc._id === CLIENT_DDOC_ID) {
      newDdoc.app_settings = settings;
    }
    if (!oldDdoc) {
      // this is a new ddoc - definitely install it
      return callback(null, newDdoc);
    }
    if (!areAttachmentsEqual(oldDdoc, newDdoc)) {
      // attachments have been updated - install it
      return callback(null, newDdoc);
    }

    if (newDdoc._attachments) {
      // we've checked attachment data so we know they're identical where it counts
      oldDdoc._attachments = newDdoc._attachments;
    }

    if (_.isEqual(oldDdoc, newDdoc)) {
      return callback();
    }
    callback(null, newDdoc);
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
