//
// Uses the same logic we used to use at runtime to find the existing metadoc, and then convert into
// it into the new singular value style.
//
const db = require('../db');
const logger = require('../logger');

const TRANSITION_SEQ_DOCUMENT = '_local/transitions-seq';
const METADATA_DOCUMENT = '_local/sentinel-meta-data';
const OLD_METADATA_DOCUMENT = 'sentinel-meta-data';

const migrateOldMetaDoc = doc => {
  const stub = {
    _id: doc._id,
    _rev: doc._rev,
    _deleted: true,
  };
  logger.info('Deleting old metadata document: %o', doc);
  return db.medic
    .put(stub)
    .then(() => {
      doc._id = METADATA_DOCUMENT;
      delete doc._rev;
      return doc;
    })
    .catch(err => {
      throw err;
    });
};

const getExistingMetaDataDoc = () => {
  return db.sentinel.get(METADATA_DOCUMENT).catch(err => {
    if (err.status !== 404) {
      throw err;
    }
    return db.medic
      .get(METADATA_DOCUMENT)
      .then(doc => {
        // Old doc exists, delete it and return the base doc to be saved later
        return migrateOldMetaDoc(doc);
      })
      .catch(err => {
        if (err.status !== 404) {
          throw err;
        }
        // Doc doesn't exist.
        // Maybe we have the doc in the old location?
        return db.medic
          .get(OLD_METADATA_DOCUMENT)
          .then(doc => {
            // Old doc exists, delete it and return the base doc to be saved later
            return migrateOldMetaDoc(doc);
          })
          .catch(err => {
            if (err.status !== 404) {
              throw err;
            }
            // No doc at all, create and return default
            return {
              _id: METADATA_DOCUMENT,
              processed_seq: 0,
            };
          });
      });
  });
};

const convertToNewStyle = (metadataDoc) => {
  metadataDoc._deleted = true;
  const newMetaDoc = {
    _id: TRANSITION_SEQ_DOCUMENT,
    value: metadataDoc.processed_seq
  };

  return db.sentinel.bulkDocs([metadataDoc, newMetaDoc]);
};

module.exports = {
  name: 'extract-transition-seq',
  created: new Date('2020-06-01'),
  run: () => {
    return getExistingMetaDataDoc()
      .then(convertToNewStyle);
  }
};
