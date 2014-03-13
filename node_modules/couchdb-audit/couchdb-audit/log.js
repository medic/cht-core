var async = require('async');

module.exports = {

  /**
   * Initialise the audit logger.
   *
   * @name withNode(appname, felix, name)
   * @param {String} appname The name of the app.
   * @param {Object} felix The felix instance to use to persist.
   * @param {String|Function(err, name)} name Either the authors name, 
   *    or a function to retrieve the name.
   * @api public
   */
  withNode: function(appname, felix, name) {
    var nameFn = (typeof name === 'string') ? 
      function(callback) { callback(null, name); } : name;
    return init(appname, felix, nameFn);
  }
};

function init(appname, db, nameFn) {
  function audit(docs, callback) {
    nameFn(function(err, userName) {
      if (err) {
        return callback('Failed getting user name. ' + err);
      }
      async.map(docs, function(_doc, _cb) {
        if (!_doc._id) {
          db.uuids(1, function(err, ids) {
            if (err) {
              return _cb('Failed generating a new database ID. ' + err);
            }
            _doc._id = ids[0];
            var audit = createAudit(_doc);
            audit.history.push(createHistory(
              'create', userName, _doc
            ));
            _cb(null, audit);
          });
        } else {
          db.view(appname, 'audit_records_by_doc', {
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
        db.bulkDocs({docs: auditRecords}, callback);
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
  };

  return {

    /**
     * Saves the given doc with an audit record
     *
     * @name saveDoc(doc, callback)
     * @param {Object} doc
     * @param {Function} callback(err,response)
     * @api public
     */
    saveDoc: function(doc, callback) {
      audit([doc], function(err) {
        if (err) {
          return callback('Failed saving audit record. ' + err);
        }
        db.saveDoc(doc, callback);
      });
    },

    /**
     * Saves the given docs with individual audit records
     *
     * @name bulkSave(docs, options, callback)
     * @param {Array} docs An array of documents to be saved
     * @param {Object} options Optional options to pass through to bulk save
     * @param {Function} callback(err,response)
     * @api public
     */
    bulkSave: function(docs, options, callback) {
      if (!callback) {
        callback = options;
        options = {};
      }
      audit(docs, function(err) {
        if (err) {
          return callback('Failed saving audit records. ' + err);
        }
        options.docs = docs;
        db.bulkDocs(options, callback);
      });
    }

  };
}

