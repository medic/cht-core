var _ = require('underscore');

var TOMBSTONE_TYPE = 'tombstone',
    TOMBSTONE_ID_SEPARATOR = '____',
    COUCHDB_TOMBSTONE_PROPERTIES = [
      '_id',
      '_rev',
      '_deleted',
      '_revisions',   // GET with `revs`
      '_attachments', // _changes with `attachments`
      '_conflicts',   // _changes with `conflicts`
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
  if (change.doc && !isDeleteStub(change.doc)) {
    return Promise.resolve(change.doc);
  }

  return DB
    .get(change.id, { rev: change.changes[0].rev, revs: true })
    .then(function(doc) {
      if (!isDeleteStub(doc)) {
        return doc;
      }

      // we've received a delete stub doc
      var previousRevision = getPreviousRev(doc._revisions);
      if (!previousRevision) {
        return doc;
      }

      return DB.get(change.id, { rev: previousRevision });
    });
};

// CouchDB/Fauxton deletes don't include doc fields in the deleted revision
var isDeleteStub = function(doc) {
  // determines if array2 is included in array1
  var arrayIncludes = function(array1, array2) {
    return array2.every(function(elem) {
      return array1.indexOf(elem) !== -1;
    });
  };

  return arrayIncludes(COUCHDB_TOMBSTONE_PROPERTIES, Object.keys(doc)) && !!doc._deleted;
};

// Returns previous rev
// @param {Object} revisions - doc _revisions
var getPreviousRev = function(revisions) {
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

// exposed for testing
module.exports._isDeleteStub = isDeleteStub;
module.exports._getPreviousRev = getPreviousRev;
