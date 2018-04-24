const db = require('../db-nano'),
      dbPouch = require('../db-pouch'),
      logger = require('../lib/logger'),
      infoDocId = id => id + '-info';

const findInfoDoc = (db, change) => {
  return db.get(infoDocId(change.id))
    .catch(err => {
      if(err.status === 404) {
        return null;
      }
      throw err;
    });
};

const getInfoDoc = change => {
  return findInfoDoc(dbPouch.sentinel, change)
    .then(doc => {
      if (doc) {
        return doc;
      }
      return findInfoDoc(dbPouch.medic, change)
        .then(doc => {
          if (doc) {
            // prepare the doc for saving into the new db
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
        return generateInfoDocFromAuditTrail(change.id)
          .then(doc => {
            return doc || createInfoDoc(change.id, 'unknown');
          });
      }
    })
    .then(doc => updateInfoDoc(doc));
};

const createInfoDoc = (docId, initialReplicationDate) => {
  return  {
    _id: infoDocId(docId),
    type: 'info',
    doc_id: docId,
    initial_replication_date: initialReplicationDate
  };
};

const generateInfoDocFromAuditTrail = docId => {
  return new Promise((resolve, reject) => {
    db.audit.get(docId, (err, result) => {
      if (err && err.status !== 404) {
        return reject(err);
      }
      const create = result && result.doc && result.doc.history &&
        result.doc.history.find(el => el.action === 'create');

      if (create) {
        return resolve(createInfoDoc(docId, create.timestamp));
      }
      return resolve();
    });
  });
};

const deleteInfoDoc = change => {
  return dbPouch.sentinel.get(infoDocId(change.id))
    .then(doc => {
      doc._deleted = true;
      return dbPouch.sentinel.put(doc);
    })
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }
    });
};

const updateInfoDoc = doc => {
  doc.latest_replication_date = new Date();
  return dbPouch.sentinel.put(doc)
    .then(() => { return doc; });
};

const updateTransition = (change, transition, ok) => {
  return findInfoDoc(dbPouch.sentinel, change)
    .then(doc => {
      doc = doc || change.info;
      doc.transitions = doc.transitions || {};
      doc.transitions[transition] = {
        last_rev: change.doc._rev,
        seq: change.seq,
        ok: ok
      };

      return dbPouch.sentinel.put(doc)
        .catch(err => {
          logger.error('Error updating metaData', err);
        });
    });
};

module.exports = {
  get: change => getInfoDoc(change),
  delete: change => deleteInfoDoc(change),
  updateTransition: (change, transition, ok) => updateTransition(change, transition, ok)
};
