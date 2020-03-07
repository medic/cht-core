const db = require('../db');
const logger = require('../lib/logger');

const SENTINEL_METADATA_DOCUMENT = '_local/sentinel-meta-data';
const OLD_SENTINEL_METADATA_DOCUMENT = 'sentinel-meta-data';

const READDOCS_METADATA_DOCUMENT = '_local/readdocs-meta-data';

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
      doc._id = SENTINEL_METADATA_DOCUMENT;
      delete doc._rev;
      return doc;
    })
    .catch(err => {
      throw err;
    });
};

const getSentinelMetaData = () => {
  return db.sentinel.get(SENTINEL_METADATA_DOCUMENT).catch(err => {
    if (err.status !== 404) {
      throw err;
    }
    return db.medic
      .get(SENTINEL_METADATA_DOCUMENT)
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
          .get(OLD_SENTINEL_METADATA_DOCUMENT)
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
              _id: SENTINEL_METADATA_DOCUMENT,
              processed_seq: 0,
            };
          });
      });
  });
};

const getReadDocsMetaData = () => {
  return db.sentinel.get(READDOCS_METADATA_DOCUMENT)
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }
      // No doc at all, create and return default
      return {
        _id: READDOCS_METADATA_DOCUMENT,
        processed_seq: 0,
      };
  });
};

const getSentinelProcessedSeq = () => {
  return getSentinelMetaData()
    .then(doc => doc.processed_seq)
    .catch(err => {
      logger.error('Error getting meta data: %o', err);
      throw err;
    });
};

const updateSentinelMetaData = seq => {
  return getSentinelMetaData()
    .then(doc => {
      doc.processed_seq = seq;
      return db.sentinel.put(doc).catch(err => {
        if (err) {
          logger.error('Error updating metaData: %o', err);
        }
      });
    })
    .catch(err => {
      logger.error('Error fetching metaData for update: %o', err);
      return null;
    });
};

const getReadDocsProcessedSeq = () => {
  return getReadDocsMetaData()
    .then(doc => doc.processed_seq)
    .catch(err => {
      logger.error('Error getting meta data: %o', err);
      throw err;
    });
};

const updateReadDocsMetaData = seq => {
  return getReadDocsMetaData()
    .then(doc => {
      doc.processed_seq = seq;
      return db.sentinel.put(doc).catch(err => {
        if (err) {
          logger.error('Error updating metaData: %o', err);
        }
      });
    })
    .catch(err => {
      logger.error('Error fetching metaData for update: %o', err);
      return null;
    });
};

module.exports = {
  getProcessedSeq: () => getSentinelProcessedSeq(),
  update: seq => updateSentinelMetaData(seq),
  getReadDocsProcessedSeq: () => getReadDocsProcessedSeq(),
  updateReadDocsMetaData: seq => updateReadDocsMetaData(seq),
};
