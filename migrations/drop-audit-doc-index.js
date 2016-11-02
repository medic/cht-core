var db = require('../db'),
    async = require('async');

var DDOC_ID = '_design/medic';
var BATCH_SIZE = 1000;

var dropView = function(callback) {
  db.audit.get(DDOC_ID, function(err, ddoc) {
    if (err) {
      return callback(err);
    }
    delete ddoc.views;
    db.audit.insert(ddoc, callback);
  });
};

var needsUpdate = function(row) {
  return row.doc.type === 'audit_record' && // is an audit doc, and
         row.doc.record_id;                 // has old property
};

var createNewDocs = function(oldDocs, callback) {
  var newDocs = oldDocs.map(function(doc) {
    return {
      _id: doc.record_id + '-audit',
      type: 'audit_record',
      history: doc.history
    };
  });
  db.audit.bulk({ docs: newDocs }, callback);
};

var deleteOldDocs = function(oldDocs, callback) {
  oldDocs.forEach(function(doc) {
    doc._deleted = true;
  });
  db.audit.bulk({ docs: oldDocs }, callback);
};

var changeDocIdsBatch = function(skip, callback) {
  var options = {
    include_docs: true,
    limit: BATCH_SIZE,
    skip: skip
  };
  db.audit.list(options, function(err, result) {
    if (err) {
      return callback(err);
    }
    if (!result.rows || !result.rows.length) {
      // we've reached the end of the database!
      return callback(null, null, false);
    }
    console.log('        Processed ' + skip + ' docs of ' + result.total_rows + ' total');
    var oldDocs = result.rows.filter(needsUpdate).map(function(row) {
      return row.doc;
    });
    if (!oldDocs.length) {
      // no old docs in this batch
      return callback(null, skip + BATCH_SIZE, true);
    }
    createNewDocs(oldDocs, function(err) {
      if (err) {
        return callback(err);
      }
      deleteOldDocs(oldDocs, function(err) {
        if (err) {
          return callback(err);
        }
        // The newSkip is based on the old skip, plus the number of
        // unchanged docs. Changed docs can't be included because
        // they have just been deleted so will not be included in the
        // next query result. This means some docs will be processed
        // more than once but gaurantees every doc will be processed
        // at least once.
        var newSkip = skip + BATCH_SIZE - oldDocs.length;
        callback(null, newSkip, true);
      });
    });
  });
};

var changeDocIds = function(callback) {
  var skip = 0;
  var again = true;
  async.doWhilst(
    function(callback) {
      changeDocIdsBatch(skip, function(err, _skip, _again) {
        if (err) {
          return callback(err);
        }
        skip = _skip;
        again = _again;
        callback();
      });
    },
    function() {
      return again;
    },
    callback
  );
};

module.exports = {
  name: 'drop-audit-doc-index',
  created: new Date(2016, 1, 11),
  run: function(callback) {
    dropView(function(err) {
      if (err) {
        return callback(err);
      }
      changeDocIds(callback);
    });
  }
};
