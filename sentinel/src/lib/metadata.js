const dbPouch = require('../db-pouch'),
      logger = require('../lib/logger');

const METADATA_DOCUMENT = '_local/sentinel-meta-data';
const OLD_METADATA_DOCUMENT = 'sentinel-meta-data';

const migrateOldMetaDoc = doc => {
  const stub = {
    _id: doc._id,
    _rev: doc._rev,
    _deleted: true
  };
  logger.info('Deleting old metadata document', doc);
  return dbPouch.medic.put(stub)
    .then(() => {
      doc._id = METADATA_DOCUMENT;
      delete doc._rev;
      return doc;
    })
    .catch(err => {
      throw err;
    });
};

const getMetaData = () => {
  return dbPouch.sentinel.get(METADATA_DOCUMENT)
    .catch(err => {
      if(err.status !== 404) {
        throw err;
      }
      return dbPouch.medic.get(METADATA_DOCUMENT)
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
          return dbPouch.medic.get(OLD_METADATA_DOCUMENT)
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
                processed_seq: 0
              };
            });
          });
      });
};

const getProcessedSeq = () => {
  return getMetaData()
    .then(doc => {
      return doc.processed_seq;
    })
    .catch(err => {
      logger.error('Error getting meta data', err);
      throw err;
    });
};

const updateMetaData = seq => {
  return getMetaData()
    .then(doc => {
      doc.processed_seq = seq;
      return dbPouch.sentinel.put(doc)
        .catch(err => {
          if (err) {
            logger.error('Error updating metaData', err);
          }
        });
    })
    .catch(err => {
      logger.error('Error fetching metaData for update', err);
      return null;
    });
};

module.exports = {
  getProcessedSeq:  () => getProcessedSeq(),
  update: seq => updateMetaData(seq)
};
