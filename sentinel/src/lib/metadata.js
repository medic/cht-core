// Manages accessing and writing of single value metadata documents
const db = require('../db');

const TRANSITION_SEQ_DOCUMENT = '_local/transitions-seq';
const BACKGROUND_CLEANUP_SEQ_DOCUMENT = '_local/background-seq';

const getValue = (docId, defaultValue) => db.sentinel.get(docId)
  .then(doc => doc.value)
  .catch(err => {
    if (err.status !== 404) {
      throw err;
    }

    return defaultValue;
  });

const setValue = (docId, value) =>
  db.sentinel.get(docId)
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


module.exports = {
  getTransitionSeq: () => getValue(TRANSITION_SEQ_DOCUMENT, 0),
  setTransitionSeq: seq => setValue(TRANSITION_SEQ_DOCUMENT, seq),
  getBackgroundCleanupSeq: () => getValue(BACKGROUND_CLEANUP_SEQ_DOCUMENT, 0),
  setBackgroundCleanupSeq: seq => setValue(BACKGROUND_CLEANUP_SEQ_DOCUMENT, seq),
  _getValue: getValue,
  _setValue: setValue
};
