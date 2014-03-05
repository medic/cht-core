var db = require('db'),
  duality = require('duality/core'),
  appname = require('settings/root').name,
  _ = require('underscore');

module.exports = {
  log: function(doc, meta, callback) {
    var appdb = db.use(duality.getDBURL());
    appdb.getView(appname, 'audit_records_by_doc', {
      include_docs: false,
      startkey: [doc._id],
      endkey: [doc._id, {}]
    }, function(err, result) {
      if (err) {
        return callback(err);
      }
      var record;
      if (result.rows.length === 0) {
        record = createRecord(doc, meta);
      } else {
        record = result.rows[0];
        var action = doc._deleted ? 'delete' : 'update';
        record.history.push(createItem(meta, action));
      }
      appdb.saveDoc(record, callback);
    });
  }
};

function createRecord(doc, meta) {
  return {
    type: 'audit_record',
    record_id: doc._id,
    history: [createItem(meta, 'create')]
  };
}

function createItem(meta, action) {
  return {
    user: meta.user,
    action: action,
    timestamp: JSON.stringify(new Date())
  };
}