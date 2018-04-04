const db = require('../db'),
      dbPouch = require('../db-pouch'),
      infoDocId = id => id + '-info';

const getSisterInfoDoc = docId => {
  const id = infoDocId(docId);
  return new Promise((resolve, reject) => {
    dbPouch.sentinel.get(id)
      .then(doc => { return resolve(doc); })
      .catch(err => {
        if (err && err.status !== 404) {
          return reject(err);
        } else {
          db.medic.get(id, (err, body) => {
            if (err.statusCode !== 404) {
              return reject(err);
            }
            return resolve(body);
          });
        }
      });
    });
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
      const create = result &&
                     result.doc &&
                     result.doc.history &&
                     result.doc.history.find(el => el.action === 'create');

      if (create) {
        return resolve(createInfoDoc(docId, create.timestamp));
      }
      return resolve();
    });
  });
};

module.exports = {
  getInfoDoc: change => {
    return new Promise((resolve, reject) => {
      getSisterInfoDoc(change.id)
      .catch(err => { return reject(err); })
      .then(infoDoc => {
        if (infoDoc) {
          if(!infoDoc.transitions) {
            infoDoc.transitions = (change.doc && change.doc.transitions) || {};
          }
          infoDoc.latest_replication_date = new Date();
          dbPouch.sentinel.put(infoDoc)
          .then(() => { return resolve(infoDoc); })
          .catch(err => { return reject(err); });
        } else {
          generateInfoDocFromAuditTrail(change.id)
          .catch(err => { return reject(err); } )
          .then(infoDoc => {
            infoDoc = infoDoc || createInfoDoc(change.id, 'unknown');
            infoDoc.latest_replication_date = new Date();
            dbPouch.sentinel.put(infoDoc)
            .then(() => { return resolve(infoDoc); })
            .catch(err => { return reject(err); });
          });
        }
      });
    });
  },
  deleteInfoDoc: (change) => {
    return new Promise((resolve, reject) => {
      dbPouch.sentinel.get(`${change.id}-info`)
      .then(doc => {
        doc._deleted = true;
        dbPouch.sentinel.put(doc)
        .then(() => { return resolve(); })
        .catch(err => { return reject(err); });
      })
      .catch(err => {
        if (err && err.status !== 404) {
          return reject(err);
        }
        // don't worry about deleting a non-existant doc
        return resolve();
      });
    });
  }
};
