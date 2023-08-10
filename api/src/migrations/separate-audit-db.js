const {promisify} = require('util');
const db = require('../db');
const environment = require('../environment');
const logger = require('../logger');
const async = require('async');

const DDOC_NAME = '_design/medic';
const DDOC = {
  _id: DDOC_NAME,
  views: {'audit_records_by_doc': {
    'map': 'function (doc) {if (doc.type === \'audit_record\') {emit([doc.record_id], 1);}}'
  }}
};
const BATCH_SIZE = 100;

const ensureViewDdocExists = function(auditDb, callback) {
  auditDb.get(DDOC_NAME, function(err) {
    if (err && err.status === 404) {
      logger.info(`${DDOC_NAME} audit ddoc does not exist, creating`);
      return auditDb.put(DDOC, callback);
    } else {
      return callback();
    }
  });
};

const batchMoveAuditDocs = function(auditDb, callback) {
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

    const auditDocIds = doclist.rows.map((row) => row.id);

    db.medic.replicate.to(auditDb, { doc_ids: auditDocIds })
      .on('complete', () => {
        db.medic.allDocs({ keys: auditDocIds })
          .then(stubs => {
            const bulkDeleteBody = stubs.rows.map(row => {
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
    const closeCallback = (err, result) => {
      db.close(auditDb);
      callback(err, result);
    };
    ensureViewDdocExists(auditDb, err => {
      if (err) {
        return logger.info(`An error occurred creating audit db: ${err}`);
      }

      let lastLength;
      async.doWhilst(
        function(callback) {
          batchMoveAuditDocs(auditDb, function(err, changed) {
            lastLength = changed;
            return callback(err);
          });
        },
        function(cb) {
          return cb(null, lastLength > 0);
        },
        closeCallback
      );
    });
  })
};
