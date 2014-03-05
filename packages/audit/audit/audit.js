var db = require('db'),
  duality = require('duality/core'),
  appname = require('settings/root').name,
  session = require('session'),
  _ = require('underscore');

module.exports = {
  create: function(doc, docid, callback) {
    var appdb = db.use(duality.getDBURL());
    getUsername(function(user) {
      var record = createRecord(docid);
      record.history.push(createItem(doc, user, 'create'));
      appdb.saveDoc(record, callback);
    });
  },
  update: function(doc, callback) {
    var appdb = db.use(duality.getDBURL());
    appdb.getView(appname, 'audit_records_by_doc', {
      include_docs: false,
      startkey: [doc._id],
      endkey: [doc._id, {}]
    }, function(err, result) {
      if (err) {
        return callback(err);
      }
      getUsername(function(user) {
        var record = result.rows.length === 0 ? 
          createRecord(doc._id) : result.rows[0];
        var action = doc._deleted ? 'delete' : 'update';
        record.history.push(createItem(doc, user, action));
        appdb.saveDoc(record, callback);
      });
    });
  }
};

function getUsername(callback) {
  session.info(function (err, info) {
    callback.call(this, err ? undefined : info.userCtx.name);
  });
}

function createRecord(docid) {
  return {
    type: 'audit_record',
    record_id: docid,
    history: []
  };
}

function createItem(doc, user, action) {
  return {
    user: user,
    action: action,
    reported_date: new Date().toISOString(),
    doc: doc
  };
}