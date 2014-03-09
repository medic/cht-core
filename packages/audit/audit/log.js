var db = require('db'),
  duality = require('duality/core'),
  appname = require('settings/root').name,
  async = require('async'),
  _ = require('underscore');

// TODO documentation
module.exports = {
  saveDoc: function(doc, callback) {
    var appdb = db.use(duality.getDBURL());
    audit(appdb, [doc], function(err) {
      if (err) {
        return callback('Failed saving audit record. ' + err);
      }
      appdb.saveDoc(doc, callback);
    });
  },

  bulkSave: function(docs, callback) {
    var appdb = db.use(duality.getDBURL());
    audit(appdb, docs, function(err) {
      if (err) {
        return callback('Failed saving audit records. ' + err);
      }
      appdb.bulkSave(docs, callback);
    });
  }
};

function audit(appdb, docs, callback) {
  async.map(docs, function(_doc, _cb) {
    if (!_doc._id) {
      db.newUUID(100, function(err, id) {
        if (err) {
          return _cb('Failed generating a new database ID. ' + err);
        }
        _doc._id = id;
        var audit = createAudit(_doc);
        audit.history.push({
          action: 'create',
          doc: _doc
        });
        _cb(null, audit);
      });
    } else {
      appdb.getView(appname, 'audit_records_by_doc', {
        include_docs: false,
        startkey: [_doc._id],
        endkey: [_doc._id, {}]
      }, function(err, result) {
        if (err) {
          return callback('Failed retrieving existing audit log. ' + err);
        }
        var audit = result.rows.length === 0 ? 
          createAudit(_doc) : result.rows[0];
        audit.history.push({
          action: _doc._deleted ? 'delete' : 'update',
          doc: _doc
        });
        _cb(null, audit);
      });
    }
  }, function(err, auditRecords) {
    appdb.bulkSave(auditRecords, callback);
  });
}

function createAudit(record) {
  return {
    type: 'audit_record',
    record_id: record._id,
    history: []
  };
}