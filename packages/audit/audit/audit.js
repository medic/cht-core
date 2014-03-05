var db = require('db'),
  duality = require('duality/core'),
  appname = require('settings/root').name,
  _ = require('underscore');

module.exports = {
  log: function(doc, user, callback) {
    // can i get the user from the session???
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
        record = createRecord(doc, user);
      } else {
        record = result.rows[0];
        var action = doc._deleted ? 'delete' : 'update';
        record.history.push(createItem(doc, user, action));
      }
      appdb.saveDoc(record, callback);
    });
  }
};

function createRecord(doc, user) {
  return {
    type: 'audit_record',
    record_id: doc._id,
    history: [createItem(doc, user, 'create')]
  };
}

function createItem(doc, user, action) {
  return {
    user: user,
    action: action,
    timestamp: JSON.stringify(new Date()),
    doc: doc
  };
}