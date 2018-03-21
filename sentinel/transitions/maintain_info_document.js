const db = require('../db-nano'),
      infoDocId = id => id + '-info';

const getSisterInfoDoc = (docId, callback) =>
  db.medic.get(infoDocId(docId), (err, body) => {
    if (err && err.statusCode !== 404) {
      callback(err);
    } else {
      callback(null, body);
    }
  });

const createInfoDoc = (docId, initialReplicationDate) => {
  return  {
    _id: infoDocId(docId),
    type: 'info',
    doc_id: docId,
    initial_replication_date: initialReplicationDate
  };
};

const generateInfoDocFromAuditTrail = (docId, callback) =>
  db.audit.get(docId, (err, result) => {
    if (err && err.statusCode !== 404) {
      callback(err);
    } else {
      const create = result &&
                     result.doc &&
                     result.doc.history &&
                     result.doc.history.find(el => el.action === 'create');

      if (create) {
        callback(null, createInfoDoc(docId, create.timestamp));
      } else {
        callback();
      }
    }
  });

module.exports = {
  filter: doc => !(doc._id.startsWith('_design') ||
                   doc.type === 'info'),
  onMatch: change => {
    return new Promise((resolve, reject) => {
      getSisterInfoDoc(change.id, (err, infoDoc) => {
        // If we pass callback directly to other functions they may return a
        // second parameter that is considered truthy and invoke
        // index.js:applyTransition() to call _setProperty and write to the
        // document needlessly
        const done = err => {
          if (err) {
            return reject(err);
          }
          resolve();
        };

        if (err) {
          return reject(err);
        }

        if (infoDoc) {
          infoDoc.latest_replication_date = new Date();
          return db.medic.insert(infoDoc, done);
        }

        generateInfoDocFromAuditTrail(change.id, (err, infoDoc) => {
          if (err) {
            return done(err);
          }

          infoDoc = infoDoc || createInfoDoc(change.id, 'unknown');

          infoDoc.latest_replication_date = new Date();
          return db.medic.insert(infoDoc, done);
        });
      });
    });
  }
};
