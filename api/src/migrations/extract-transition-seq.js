//
// Uses the same logic we used to use at runtime to find the existing metadoc, and then convert into
// it into the new singular value style.
//
const db = require('../db');
const logger = require('../logger');

const TRANSITION_SEQ_DOCUMENT = '_local/transitions-seq';
const METADATA_DOCUMENT = '_local/sentinel-meta-data';
const OLD_METADATA_DOCUMENT = 'sentinel-meta-data';

const deleteOldMetadataDoc = doc => {
  const stub = {
    _id: doc._id,
    _rev: doc._rev,
    _deleted: true,
  };
  logger.info('Deleting old metadata document: %o', doc);
  return db.medic
    .put(stub)
    .then(() => {
      return doc.processed_seq;
    });
};

const getExistingMetaDoc = () => {
  return db.sentinel.get(METADATA_DOCUMENT)
    .then(doc => ({doc, db: db.sentinel}))
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }
      return db.medic.get(METADATA_DOCUMENT)
        .then(doc => ({doc, db: db.medic}))
        .catch(err => {
          if (err.status !== 404) {
            throw err;
          }
          return db.medic.get(OLD_METADATA_DOCUMENT)
            .then(doc => ({doc, db: db.medic}))
            .catch(err => {
              if (err.status !== 404) {
                throw err;
              }
              // No doc at all
            });
        });
    });
};

const convertToNewStyle = (transitionSeq = '0') => {
  const newMetaDoc = {
    _id: TRANSITION_SEQ_DOCUMENT,
    value: transitionSeq
  };

  return db.sentinel.put(newMetaDoc);
};

module.exports = {
  name: 'extract-transition-seq',
  created: new Date('2020-06-01'),
  run: () => {
    return getExistingMetaDoc()
      .then(({doc, db} = {}) => {
        if (doc) {
          logger.info(`Found existing ${doc._id} in ${db.name}`);
          return deleteOldMetadataDoc(doc, db);
        }

        logger.info('No transition seq meta doc, creating new one');
      })
      .then(convertToNewStyle);
  }
};
