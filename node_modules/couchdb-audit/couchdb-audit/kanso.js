var log = require('couchdb-audit/log'),
    appname = require('settings/root').name,
    session = require('session');

module.exports = {
  withKanso: function(db) {
    return log.init(appname, {
      view: function(design, view, query, callback) {
        db.getView.call(db, design, view, query, callback);
      },
      getDoc: function(id, callback) {
        db.getDoc.call(db, id, callback);
      },
      saveDoc: function(doc, callback) {
        db.saveDoc.call(db, doc, callback);
      },
      bulkDocs: function(options, callback) {
        db.bulkSave.call(db, options.docs, options, callback);
      },
      uuids: function(count, callback) {
        db.newUUID.call(db, 100, function(err, id) {
          callback(err, [id]);
        });
      }
    }, function(callback) {
      session.info(function(err, result) {
        if (err) {
          return callback(err);
        }
        callback(null, result.userCtx.name);
      });
    });
  }
};