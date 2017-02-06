var infoDocId = function(id) {
  return id + '-info';
};

var getSisterInfoDoc = function(db, docId, callback) {
  db.medic.get(infoDocId(docId), function(err, body) {
    if (err && err.statusCode !== 404) {
      callback(err);
    } else {
      callback(null, body);
    }
  });
};

var generateInfoDocFromAuditTrail = function(audit, docId, callback) {
  audit.get(docId, function(err, result) {
    if (err && err.statusCode !== 404) {
      callback(err);
    } else {
      var create = result &&
                   result.doc &&
                   result.doc.history &&
                   result.doc.history.find(function(el) {
        return el.action === 'create';
      });

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
};

module.exports = {
  filter: function(doc) {
    return !(doc._id.startsWith('_design') ||
             doc.type === 'info');
  },
  onMatch: function(change, db, audit, callback) {
    getSisterInfoDoc(db, change.id, function(err, infoDoc) {
      if (err) {
        return callback(err);
      }


      if (infoDoc) {
        infoDoc.latest_replication_date = new Date();
        return db.medic.insert(infoDoc, callback);
      }

      generateInfoDocFromAuditTrail(audit, change.id, function(err, infoDoc) {
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
    });
  }
};
