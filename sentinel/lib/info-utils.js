const db = require('../db'),
      dbPouch = require('../db-pouch'),
      infoDocId = id => id + '-info';

const getSisterInfoDoc = (docId, callback) =>
  dbPouch.sentinel.get(infoDocId(docId), (err, body) => {
    if (err && err.statusCode === 404) {
      db.medic.get(infoDocId(docId), (err, body) => {
        if (err && err.statusCode !== 404) {
          callback(err);
        } else {
          callback(null, body);
        }
      });
    } else if (err) {
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
  getInfoDoc: change => {
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
          return resolve(infoDoc);
        };
        if (err) {
          return reject(err);
        }
        if (infoDoc) {
          if(!infoDoc.transitions) {
            infoDoc.transitions = change.doc.transitions || {};
          }
          infoDoc.latest_replication_date = new Date();
          return dbPouch.sentinel.put(infoDoc, done);
        }

        generateInfoDocFromAuditTrail(change.id, (err, infoDoc) => {
          if (err) {
            return done(err);
          }
          infoDoc = infoDoc || createInfoDoc(change.id, 'unknown');
          infoDoc.latest_replication_date = new Date();
          return dbPouch.sentinel.put(infoDoc, done);
        });
      });
    });
  },
  deleteInfoDoc: (change, callback) => {
    dbPouch.sentinel.get(`${change.id}-info`, (err, doc) => {
      if (err) {
        if (err.statusCode === 404) {
          // don't worry about deleting a non-existant doc
          return callback();
        }
        return callback(err);
      }
      doc._deleted = true;
      dbPouch.sentinel.put(doc, callback);
    });
  }
};
