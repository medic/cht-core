// Manages accessing and writing of single value metadata documents
const db = require('../db');

const TRANSITION_SEQ_DOCUMENT = '_local/transitions-seq';

const getValue = docId => db.sentinel.get(docId).then(doc => doc.value);

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
  getTransitionSeq: () => getValue(TRANSITION_SEQ_DOCUMENT),
  setTransitionSeq: seq => setValue(TRANSITION_SEQ_DOCUMENT, seq),
};
