const db = require('../db-pouch'),
  { logger } = require('../lib/logger'),
  infoDocId = id => id + '-info';

const findInfoDoc = (database, change) => {
  return database.get(infoDocId(change.id))
    .catch(err => {
      if(err.status === 404) {
        return null;
      }
      throw err;
    });
};

const getInfoDoc = change => {
  let rev = null;
  return findInfoDoc(db.sentinel, change)
    .then(doc => {
      if (doc) {
        return doc;
      }
      return findInfoDoc(db.medic, change)
        .then(doc => {
          if (doc) {
            // prepare the doc for saving into the new db
            rev = doc._rev;
            delete doc._rev;
          }
          return doc;
        });
    })
    .then(doc => {
      if (doc) {
        doc.transitions = doc.transitions || change.doc.transitions || {};
        return doc;
      } else {
        return createInfoDoc(change.id, 'unknown');
      }
      return null;
    })
    .then(doc => updateInfoDoc(doc, rev));
};

const createInfoDoc = (docId, initialReplicationDate) => {
  return  {
    _id: infoDocId(docId),
    type: 'info',
    doc_id: docId,
    initial_replication_date: initialReplicationDate
  };
};

const deleteInfoDoc = change => {
  return db.sentinel
    .get(infoDocId(change.id))
    .then(doc => {
      doc._deleted = true;
      return db.sentinel.put(doc);
    })
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }
    });
};

const updateInfoDoc = (doc, legacyRev) => {
  doc.latest_replication_date = new Date();
  return db.sentinel.put(doc)
    .then(() => {
      if(legacyRev) {
        // Removes legacy info doc
        db.medic.remove(doc._id, legacyRev);
      }
      return doc;
    });
};

const updateTransition = (change, transition, ok) => {
  return findInfoDoc(db.sentinel, change).then(doc => {
    doc = doc || change.info;
    doc.transitions = doc.transitions || {};
    doc.transitions[transition] = {
      last_rev: change.doc._rev,
      seq: change.seq,
      ok: ok,
    };

    return db.sentinel.put(doc).catch(err => {
      logger.error('Error updating metaData', err);
    });
  });
};

module.exports = {
  get: change => getInfoDoc(change),
  delete: change => deleteInfoDoc(change),
  updateTransition: (change, transition, ok) =>
    updateTransition(change, transition, ok),
};
