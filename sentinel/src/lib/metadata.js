// Manages accessing and writing of single value metadata documents
const db = require('../db');
const {
  SENTINEL_METADATA: {
    TRANSITIONS_SEQ: TRANSITION_SEQ_DOCUMENT,
    BACKGROUND_SEQ: BACKGROUND_CLEANUP_SEQ_DOCUMENT
  }
} = require('@medic/constants');

const getValue = (docId, defaultValue) =>  {
  return db.sentinel
    .get(docId)
    .then(doc => doc.value)
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }

      return defaultValue;
    });
};

const setValue = (docId, value) => {
  return db.sentinel
    .get(docId)
    .then(doc => {
      doc.value = value;
      return doc;
    })
    .catch(err => {
      if (err.status === 404) {
        return {
          _id: docId,
          value: value
        };
      }

      throw err;
    })
    .then(doc => db.sentinel.put(doc));
};

module.exports = {
  getTransitionSeq: () => getValue(TRANSITION_SEQ_DOCUMENT, '0'),
  setTransitionSeq: seq => setValue(TRANSITION_SEQ_DOCUMENT, seq),
  getBackgroundCleanupSeq: () => getValue(BACKGROUND_CLEANUP_SEQ_DOCUMENT, '0'),
  setBackgroundCleanupSeq: seq => setValue(BACKGROUND_CLEANUP_SEQ_DOCUMENT, seq),
  _getValue: getValue,
  _setValue: setValue
};
