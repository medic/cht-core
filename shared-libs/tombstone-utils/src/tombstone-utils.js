var _ = require('underscore');

var TYPES = ['data_record', 'person', 'clinic', 'district_hospital', 'health_center'],
    TOMBSTONE_TYPE = 'tombstone';

module.exports = function(DB, Promise) {
  var needsTombstone = function (doc) {
    return TYPES.indexOf(doc.type) !== -1;
  };

  var generateTombstoneId = function (docId) {
    return [docId, TOMBSTONE_TYPE].join('-');
  };

  var saveTombstone = function(doc, logger) {
    var tombstone = _.omit(doc, ['_attachments', 'transitions', '_deleted']);
    var tombstoneDoc = {
      _id: generateTombstoneId(doc._id),
      _rev: doc._rev,
      type: TOMBSTONE_TYPE,
      tombstone: tombstone
    };

    logger.log('saving tombstone for ' + doc._id);

    // ensure the tombstone doc gets the same _rev as the deleted doc it represents
    return DB.bulkDocs({ docs: [tombstoneDoc], new_edits: false });
  };

  var getDoc = function(change) {
    if (change.doc) {
      return Promise.resolve(change.doc);
    }

    return DB.get(change.id, { rev: change.changes[0].rev });
  };

  var extractDocId = function (tombstoneId) {
    return tombstoneId.replace('-' + TOMBSTONE_TYPE, '');
  };

  var generateChangeFromTombstone = function(change) {
    return {
      id: extractDocId(change.id),
      seq: change.seq,
      changes: change.changes,
      doc: change.doc && change.doc.tombstone,
      deleted: true
    };
  };

  return {
    processChange: function (change, logger) {
      if (!logger) {
        logger = console;
      }
      logger.log('processing tombstome for ' + change.id);
      return getDoc(change)
        .then(function(doc) {
          return needsTombstone(doc) && saveTombstone(doc, logger);
        })
        .catch(function(err) {
          logger.error('Tombstone: could not process doc id:' + change.id + ' seq:' + change.seq, err);
        });
    },

    saveTombstone: saveTombstone,
    needsTombstone: needsTombstone,
    getDoc: getDoc,
    generateChangeFromTombstone: generateChangeFromTombstone,
    extractDocId: extractDocId,

    hasTombstone: function (doc) {
      return DB
        .get(generateTombstoneId(doc._id))
        .then(function() {
          return false;
        })
        .catch(function(err) {
          return err.status === 404;
        });
    },

    isTombstone: function (doc) {
      return doc.type === TOMBSTONE_TYPE;
    },

    isTombstoneId: function(tombstoneId) {
      return tombstoneId.endsWith('-' + TOMBSTONE_TYPE);
    },

    extractDoc: function(tombstoneDoc) {
      return tombstoneDoc.tombstone;
    }
  };
};