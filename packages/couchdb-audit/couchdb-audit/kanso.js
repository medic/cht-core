var log = require('couchdb-audit/log'),
    appname = require('settings/root').name,
    session = require('session');

module.exports = {

  /**
   * Sets up auditing to work with the kanso db module.
   * 
   * @name withKanso(db)
   * @param {Object} db The kanso db instance to use.
   * @api public
   */
  withKanso: function(db) {
    var dbWrapper = {
      view: function(design, view, query, callback) {
        db.getView.call(db, design, view, query, callback);
      },
      getDoc: function(id, callback) {
        db.getDoc.call(db, id, callback);
      },
      saveDoc: function(doc, callback) {
        db.saveDoc.call(db, doc, callback);
      },
      removeDoc: function(id, rev, callback) {
        db.removeDoc.call(db, { _id: id, _rev: rev }, callback);
      },
      bulkDocs: function(options, callback) {
        db.bulkSave.call(db, options.docs, options, callback);
      }
    };
    var clientWrapper = {
      uuids: function(count, callback) {
        db.newUUID.call(db, 100, function(err, id) {
          callback(err, {uuids: [id]});
        });
      }
    };
    return log.init(appname, clientWrapper, dbWrapper, function(callback) {
      session.info(function(err, result) {
        if (err) {
          return callback(err);
        }
        callback(null, result.userCtx.name);
      });
    });
  },

  /**
   * Exposed for testing only
   *
   * @api private
   */
  withSession: function(mock) {
    session = mock;
    return module.exports;
  }
};