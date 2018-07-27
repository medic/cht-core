var _ = require('underscore');

var TOMBSTONE_TYPE = 'tombstone',
    TOMBSTONE_ID_SEPARATOR = '____',
    COUCHDB_TOMBSTONE_PROPERTIES = [
      '_id',               // CouchDB tombstone field
      '_rev',              // CouchDB tombstone field
      '_deleted',          // CouchDB tombstone field
      '_revisions',        // field present in { revs: true } GET
      '_attachments',      // field present when requesting _changes with { attachments: true }
      '_conflicts',        // field present when requesting _changes with { conflicts: true }
    ];

var generateTombstoneId = function (id, rev) {
  return [id, rev, TOMBSTONE_TYPE].join(TOMBSTONE_ID_SEPARATOR);
};

var saveTombstone = function(DB, doc, change, logger) {
  var tombstone = _.omit(doc, ['_attachments', '_deleted', '_revisions', '_conflicts']);
  var tombstoneDoc = {
    _id: generateTombstoneId(change.id, change.changes[0].rev),
    type: TOMBSTONE_TYPE,
    tombstone: tombstone
  };

  logger.info('saving tombstone for ' + doc._id);

  return DB
    .put(tombstoneDoc)
    .catch(function(error) {
      if (error.status === 409) {
        return;
      }

      throw error;
    });
};

var getDoc = function(Promise, DB, change) {
  if (change.doc && !isCouchDbTombstone(change.doc)) {
    return Promise.resolve(change.doc);
  }

  return DB
    .get(change.id, { rev: change.changes[0].rev, revs: true })
    .then(function(doc) {
      if (!isCouchDbTombstone(doc)) {
        return doc;
      }

      // we've received a doc only containing _id, _rev, and _deleted flag - a result of a DELETE call
      var previousRevision = getPreviousRevision(doc._revisions);
      if (!previousRevision) {
        return doc;
      }

      return DB.get(change.id, { rev: previousRevision });
    });
};

// CouchDB `DELETE`d docs are stubs { _id, _rev, _deleted: true }
var isCouchDbTombstone = function(doc) {
  if (!_.difference(Object.keys(doc), COUCHDB_TOMBSTONE_PROPERTIES).length && doc._deleted) {
    return true;
  }

  return false;
};

// when given a list of _revisions, it will return next to last revision string
var getPreviousRevision = function(revisions) {
  if (revisions && revisions.start > 1 && revisions.ids && revisions.ids.length > 1) {
    return [revisions.start - 1, '-', revisions.ids[1]].join('');
  }
  return false;
};

module.exports = {
  regex: new RegExp('(.*)' + TOMBSTONE_ID_SEPARATOR + '(.*)' + TOMBSTONE_ID_SEPARATOR + TOMBSTONE_TYPE),

  extractStub: function(tombstoneId) {
    var match = tombstoneId.match(module.exports.regex);
    return match && { id: match[1], rev: match[2] };
  },

  extractDoc: function(tombstoneDoc) {
    return tombstoneDoc && tombstoneDoc.tombstone;
  },

  isTombstoneId: function(tombstoneId) {
    return module.exports.regex.test(tombstoneId);
  },

  processChange: function (Promise, DB, change, logger) {
    if (!logger) {
      logger = console;
    }

    if (!change.deleted) {
      throw new Error('Tombstone: received non-deletion change to tombstone');
    }

    return getDoc(Promise, DB, change)
      .then(function(doc) {
        return doc.type !== TOMBSTONE_TYPE && saveTombstone(DB, doc, change, logger);
      })
      .catch(function(err) {
        logger.error('Tombstone: could not process doc id:' + change.id + ' seq:' + change.seq, err);
        throw err;
      });
  },

  // generates a copy of the deletion change of the original document
  generateChangeFromTombstone: function(tombstoneChange, includeDoc) {
    var stub = module.exports.extractStub(tombstoneChange.id);
    var change = {
      id: stub.id,
      seq: tombstoneChange.seq,
      changes: [{ rev: stub.rev }],
      deleted: true
    };

    if (includeDoc && tombstoneChange.doc && tombstoneChange.doc.tombstone) {
      change.doc = tombstoneChange.doc.tombstone;
    }

    return change;
  }
};

module.exports._isCouchDbTombstone = isCouchDbTombstone;
module.exports._getPreviousRevision = getPreviousRevision;
