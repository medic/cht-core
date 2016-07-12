var _ = require('underscore'),
    db = require('../db'),
    async = require('async');

var DDOC_NAME = '_design/medic';
var DDOC = {'views': {'audit_records_by_doc': {'map': 'function (doc) {if (doc.type === \'audit_record\') {emit([doc.record_id], 1);}}'}}};
var BATCH_SIZE = 100;

var ensureDbExists = function(dbName, callback) {
  db.db.get(dbName, function(err) {
    if (err && err.statusCode === 404) {
      console.log('DB ' + dbName + ' does not exist, creating');
      return db.db.create(dbName, callback);
    } else {
      return callback();
    }
  });
};

var ensureViewDdocExists = function(dbName, callback) {
  var auditDb = db.use(dbName);

  auditDb.head(DDOC_NAME, function(err) {
    if (err && err.statusCode === 404) {
      console.log(DDOC_NAME + ' audit ddoc does not exist, creating');
      return auditDb.insert(DDOC, DDOC_NAME, callback);
    } else {
      return callback();
    }
  });
};

var batchMoveAuditDocs = function(callback) {
  db.medic.view('medic-client', 'doc_by_type', { key: ['audit_record'], limit: BATCH_SIZE}, function(err, doclist) {
    if (err) {
      return callback(err);
    }

    if (doclist.rows.length === 0) {
      return callback(null, 0);
    }

    // NB: doclist.total_rows returns the total of all docs in the view, not filtered by the key
    //     (ie we can't use it to show progress)
    console.log('Migrating ' + doclist.rows.length + ' audit docs');

    var auditDocIds = doclist.rows.map(function(row) { return row.id;});

    async.parallel([
      _.partial(db.db.replicate, db.settings.db, db.settings.auditDb, {doc_ids: auditDocIds}),
      _.partial(db.medic.fetchRevs, {keys: auditDocIds})
    ], function(err, results) {
      if (err) {
        return callback(err);
      }

      var bulkDeleteBody = {
        docs: results[1][0].rows.map(function(doc_rev) {
          return {
            _id: doc_rev.id,
            _rev: doc_rev.value.rev,
            _deleted: true
          };
        })
      };

      db.medic.bulk(bulkDeleteBody, function(err, response) {
        return callback(err, response && response.length);
      });
    });
  });
};

module.exports = {
  name: 'separate-audit-db',
  created: new Date(2016, 2, 18),
  run: function(callback) {
    async.series([
      _.partial(ensureDbExists, db.settings.auditDb),
      _.partial(ensureViewDdocExists, db.settings.auditDb)
      ], function(err) {
        if (err) {
          return console.log('An error occurred creating audit db', err);
        }

        var lastLength;
        async.doUntil(
          function(callback) {
            batchMoveAuditDocs(function(err, changed) {
              lastLength = changed;

              return callback(err);
            });
          },
          function() {
            return lastLength === 0;
          },
          callback);
    });
  }
};
