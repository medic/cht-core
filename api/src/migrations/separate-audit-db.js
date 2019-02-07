var {promisify} = require('util'),
    db = require('../db'),
    environment = require('../environment'),
    logger = require('../logger'),
    async = require('async');

var DDOC_NAME = '_design/medic';
var DDOC = {
  _id: DDOC_NAME,
  views: {'audit_records_by_doc': {'map': 'function (doc) {if (doc.type === \'audit_record\') {emit([doc.record_id], 1);}}'}}
};
var BATCH_SIZE = 100;

var ensureViewDdocExists = function(auditDb, callback) {
  auditDb.get(DDOC_NAME, function(err) {
    if (err && err.status === 404) {
      logger.info(`${DDOC_NAME} audit ddoc does not exist, creating`);
      return auditDb.put(DDOC, callback);
    } else {
      return callback();
    }
  });
};

var batchMoveAuditDocs = function(auditDb, callback) {
  db.medic.query('medic-client/doc_by_type', { key: ['audit_record'], limit: BATCH_SIZE}, function(err, doclist) {
    if (err) {
      return callback(err);
    }

    if (doclist.rows.length === 0) {
      return callback(null, 0);
    }

    // NB: doclist.total_rows returns the total of all docs in the view, not filtered by the key
    //     (ie we can't use it to show progress)
    logger.info(`Migrating ${doclist.rows.length} audit docs`);

    var auditDocIds = doclist.rows.map(function(row) { return row.id;});

    db.medic.replicate.to(auditDb, { doc_ids: auditDocIds })
      .on('complete', () => {
        db.medic.allDocs({ keys: auditDocIds })
          .then(stubs => {
            var bulkDeleteBody = stubs.rows.map(row => {
              return {
                _id: row.id,
                _rev: row.value.rev,
                _deleted: true
              };
            });
            return db.medic.bulkDocs(bulkDeleteBody)
              .then(response => callback(null, response.length));
          })
          .catch(callback);
      })
      .on('denied', callback)
      .on('error', callback);
  });
};

module.exports = {
  name: 'separate-audit-db',
  created: new Date(2016, 2, 18),
  run: promisify(function(callback) {
    const auditDb = db.get(environment.db + '-audit');
    ensureViewDdocExists(auditDb, err => {
      if (err) {
        return logger.info(`An error occurred creating audit db: ${err}`);
      }

      var lastLength;
      async.doUntil(
        function(callback) {
          batchMoveAuditDocs(auditDb, function(err, changed) {
            lastLength = changed;
            return callback(err);
          });
        },
        function() {
          return lastLength === 0;
        },
        callback);
    });
  })
};
