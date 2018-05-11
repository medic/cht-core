var _ = require('underscore');

var TYPES = ['data_record', 'person', 'clinic', 'district_hospital', 'health_center'],
    TOMBSTONE_TYPE = 'tombstone',
    TOMBSTONE_ID_SEPARATOR = '____';

module.exports = function(Promise, DB) {
  var needsTombstone = function (doc) {
    return TYPES.indexOf(doc.type) !== -1;
  };

  var generateTombstoneId = function (id, rev) {
    return [id, rev, TOMBSTONE_TYPE].join(TOMBSTONE_ID_SEPARATOR);
  };

  var saveTombstone = function(doc, logger) {
    var tombstone = _.omit(doc, ['_attachments', 'transitions', '_deleted']);
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

  var getDoc = function(change) {
    if (change.doc) {
      return Promise.resolve(change.doc);
    }

    return DB.get(change.id, { rev: change.changes[0].rev });
  };

  var getTombstoneRegex = function() {
    return new RegExp('(.*)' + TOMBSTONE_ID_SEPARATOR + '(.*)' + TOMBSTONE_ID_SEPARATOR + TOMBSTONE_TYPE);
  };

  var extractDocId = function (tombstoneId) {
    var match = tombstoneId.match(getTombstoneRegex());
    return match && match[1];
  };

  var extractRev = function(tombstoneId) {
    var match = tombstoneId.match(getTombstoneRegex());
    return match && match[2];
  };

  return {
    extractDocId: extractDocId,
    extractRev: extractRev,

    extractDoc: function(tombstoneDoc) {
      return tombstoneDoc && tombstoneDoc.tombstone;
    },

    isTombstoneId: function(tombstoneId) {
      return getTombstoneRegex().test(tombstoneId);
    },

    processChange: function (change, logger) {
      if (!logger) {
        logger = console;
      }
      return getDoc(change)
        .then(function(doc) {
          return needsTombstone(doc) && saveTombstone(doc, logger);
        })
        .catch(function(err) {
          logger.error('Tombstone: could not process doc id:' + change.id + ' seq:' + change.seq, err);
          throw err;
        });
    },

    // generates a copy of the deletion change of the original document
    generateChangeFromTombstone: function(tombstoneChange) {
      return {
        id: extractDocId(tombstoneChange.id),
        seq: tombstoneChange.seq,
        changes: [{ rev: extractRev(tombstoneChange.id) }],
        doc: tombstoneChange.doc && tombstoneChange.doc.tombstone,
        deleted: true
      };
    }
  };
};
