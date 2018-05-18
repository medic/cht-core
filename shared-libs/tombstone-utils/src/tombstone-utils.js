var _ = require('underscore');

var TOMBSTONE_TYPE = 'tombstone',
    TOMBSTONE_ID_SEPARATOR = '____';


var generateTombstoneId = function (id, rev) {
  return [id, rev, TOMBSTONE_TYPE].join(TOMBSTONE_ID_SEPARATOR);
};

var saveTombstone = function(DB, doc, logger) {
  var tombstone = _.omit(doc, ['_attachments', '_deleted']);
  var tombstoneDoc = {
    _id: generateTombstoneId(doc._id, doc._rev),
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
  if (change.doc) {
    return Promise.resolve(change.doc);
  }

  return DB.get(change.id, { rev: change.changes[0].rev });
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
        return doc.type !== TOMBSTONE_TYPE && saveTombstone(DB, doc, logger);
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