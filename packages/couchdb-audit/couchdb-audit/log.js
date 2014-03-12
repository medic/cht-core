var async = require('async');

module.exports = {

  /**
   * Initialise the audit to persist to the given kanso db.
   *
   * @name withKanso(db)
   * @param {String} appname The name of the couchdb app
   * @param {Object} db The kanso db instance to use
   * @param {Object} session The kanso session instance to use
   * @api public
   */
  withKanso: function(appname, db, session) {
    return init(appname, db, {
      getName: function(callback) {
        session.info(function(err, result) {
          if (err) {
            return callback(err);
          }
          callback(null, result.userCtx.name);
        });
      }
    });
  },

  withNode: function(appname, felix, userName) {
    return init(appname, {
      getView: function(design, view, query, callback) {
        felix.view.call(felix, design, view, query, callback);
      },
      getDoc: function(id, callback) {
        felix.getDoc.call(felix, id, callback);
      },
      saveDoc: function(doc, callback) {
        felix.saveDoc.call(felix, doc, callback);
      },
      bulkSave: function(docs, callback) {
        felix.bulkDocs.call(felix, {docs: docs}, callback);
      },
      newUUID: function(count, callback) {
        felix.uuids.call(felix, 1, function(uuids) {
          callback(uuids[0]);
        });
      }
    }, {
      getName: function(callback) {
        callback(null, userName);
      }
    });
  }
};

function init(appname, db, user) {
  function audit(docs, callback) {
    user.getName(function(err, userName) {
      if (err) {
        return callback('Failed getting user name. ' + err);
      }
      async.map(docs, function(_doc, _cb) {
        if (!_doc._id) {
          db.newUUID(100, function(err, id) {
            if (err) {
              return _cb('Failed generating a new database ID. ' + err);
            }
            _doc._id = id;
            var audit = createAudit(_doc);
            audit.history.push(createHistory(
              'create', userName, _doc
            ));
            _cb(null, audit);
          });
        } else {
          db.getView(appname, 'audit_records_by_doc', {
            include_docs: true,
            startkey: [_doc._id],
            endkey: [_doc._id, {}]
          }, function(err, result) {
            if (err) {
              return _cb('Failed retrieving existing audit log. ' + err);
            }
            if (result.rows.length === 0) {
              var audit = createAudit(_doc);
              if (_doc._rev) {
                // no existing audit, but existing revision - log current
                db.getDoc(_doc._id, function(err, _oldDoc) {
                  if (err) {
                    return _cb('Failed retrieving existing document. ' + err);
                  }
                  audit.history.push(createHistory(
                    isInitialRev(_oldDoc) ? 'create' : 'update', null, _oldDoc
                  ));
                  audit.history.push(createHistory(
                    _doc._deleted ? 'delete' : 'update', userName, _doc
                  ));
                  _cb(null, audit);
                });
              } else {
                // no existing audit or existing revision
                audit.history.push(createHistory(
                  'create', userName, _doc
                ));
                _cb(null, audit);
              }
            } else {
              // existing audit
              var audit = result.rows[0].doc;
              audit.history.push(createHistory(
                _doc._deleted ? 'delete' : 'update', userName, _doc
              ));
              _cb(null, audit);
            }
          });
        }
      }, function(err, auditRecords) {
        if (err) {
          return callback(err);
        }
        db.bulkSave(auditRecords, callback);
      });
    });
  };

  function isInitialRev(doc) {
    return doc._rev.indexOf('1-') === 0;
  }

  function createAudit(record) {
    return {
      type: 'audit_record',
      record_id: record._id,
      history: []
    };
  };

  function createHistory(action, user, doc) {
    return {
      action: action,
      user: user,
      timestamp: new Date().toISOString(),
      doc: doc
    };
  }

  return {

    /**
     * Saves the given doc with an audit record
     *
     * @name saveDoc(doc, callback)
     * @param {Object} db The db instance to use
     * @param {Object} doc
     * @param {Function} callback(err,response)
     * @api public
     */
    saveDoc: function(doc, callback) {
      audit([doc], function(err) {
        if (err) {
          return callback('Failed saving audit record. ' + JSON.stringify(err));
        }
        db.saveDoc(doc, callback);
      });
    },

    /**
     * Saves the given docs with individual audit records
     *
     * @name bulkSave(doc, callback)
     * @param {Object} db The kanso db instance to use
     * @param {Array} docs An array of documents; each document is an object
     * @param {Function} callback(err,response)
     * @api public
     */
    bulkSave: function(docs, callback) {
      audit(docs, function(err) {
        if (err) {
          return callback('Failed saving audit records. ' + JSON.stringify(err));
        }
        db.bulkSave(docs, callback);
      });
    }

  };
}

