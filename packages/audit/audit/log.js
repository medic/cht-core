var async = require('async'),
  appname = require('settings/root').name;

module.exports = {

  /**
   * Initialise the audit to persist to the given kanso db.
   *
   * @name withKanso(db)
   * @param {Object} db The kanso db instance to use
   * @api public
   */
  withKanso: function(db, session) {
    return init(db, {
      getName: function(callback) {
        session.info(function(err, result) {
          if (err) {
            return callback(err);
          }
          callback(null, result.userCtx.name);
        });
      }
    });
  }
};

function init(db, user) {
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
              return callback('Failed retrieving existing audit log. ' + err);
            }
            var audit = result.rows.length === 0 ? 
              createAudit(_doc) : result.rows[0].doc;
            audit.history.push(createHistory(
              _doc._deleted ? 'delete' : 'update', userName, _doc
            ));
            _cb(null, audit);
          });
        }
      }, function(err, auditRecords) {
        db.bulkSave(auditRecords, callback);
      });
    });
  };

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
          return callback('Failed saving audit record. ' + err);
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
          return callback('Failed saving audit records. ' + err);
        }
        db.bulkSave(docs, callback);
      });
    }

  };
}

