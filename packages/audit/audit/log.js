var db = require('db'),
  duality = require('duality/core'),
  appname = require('settings/root').name,
  _ = require('underscore');

module.exports = {
  saveDoc: function(doc, callback) {
    var appdb = db.use(duality.getDBURL());
    if (doc._id) {
      appdb.getView(appname, 'audit_records_by_doc', {
        include_docs: false,
        startkey: [doc._id],
        endkey: [doc._id, {}]
      }, function(err, result) {
        if (err) {
          return callback('Failed retrieving existing audit log. ' + err);
        }
        var audit = result.rows.length === 0 ? 
          createAudit(doc) : result.rows[0];
        audit.history.push({
          action: doc._deleted ? 'delete' : 'update',
          doc: doc
        });
        save(appdb, doc, audit, callback);
      });
    } else {
      db.newUUID(function(err, id) {
        if (err) {
          return callback('Failed generating a new database ID. ' + err);
        }
        doc._id = id;
        var audit = createAudit(doc);
        audit.history.push({
          action: 'create',
          doc: doc
        });
        save(appdb, doc, audit, callback);
      });
    }
  }
};

function save(appdb, doc, audit, callback) {
  appdb.saveDoc(audit, function(err, response) {
    if (err) {
      return callback('Failed saving audit record. ' + err);
    }
    appdb.saveDoc(doc, callback);
  });
}

function createAudit(record) {
  return {
    type: 'audit_record',
    record_id: record._id,
    history: []
  };
}