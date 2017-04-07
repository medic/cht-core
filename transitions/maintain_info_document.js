const infoDocId = id => id + '-info';

const getSisterInfoDoc = (db, docId, callback) =>
  db.medic.get(infoDocId(docId), (err, body) => {
    if (err && err.statusCode !== 404) {
      callback(err);
    } else {
      callback(null, body);
    }
  });

const generateInfoDocFromAuditTrail = (audit, docId, callback) =>
  audit.get(docId, (err, result) => {
    if (err && err.statusCode !== 404) {
      callback(err);
    } else {
      const create = result &&
                     result.doc &&
                     result.doc.history &&
                     result.doc.history.find(el => el.action === 'create');

      if (create) {
        callback(null, {
          _id: infoDocId(docId),
          type: 'info',
          doc_id: docId,
          initial_replication_date: create.timestamp
        });
      } else {
        callback();
      }
    }
  });

module.exports = {
  filter: doc => !(doc._id.startsWith('_design') ||
                   doc.type === 'info'),
  onMatch: (change, db, audit, callback) =>
    getSisterInfoDoc(db, change.id, (err, infoDoc) => {
      if (err) {
        return callback(err);
      }

      if (infoDoc) {
        infoDoc.latest_replication_date = new Date();
        return db.medic.insert(infoDoc, callback);
      }

      generateInfoDocFromAuditTrail(audit, change.id, (err, infoDoc) => {
        if (err) {
          return callback(err);
        }

        if (!infoDoc) {
          infoDoc = {
            _id: infoDocId(change.id),
            type: 'info',
            doc_id: change.id,
            initial_replication_date: 'unknown',
          };
        }

        infoDoc.latest_replication_date = new Date();
        return db.medic.insert(infoDoc, callback);
      });
  }
};
