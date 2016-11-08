var db = require('../db'),
    async = require('async'),
    _ = require('underscore'),
    DDOC_ID = '_design/medic',
    BATCH_SIZE = 200,
    AUDIT_ID_SUFFIX = '-audit';

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

var getAuditId = function(doc) {
  return doc.record_id + AUDIT_ID_SUFFIX;
};

var getRecordId = function(doc) {
  return doc._id.slice(0, -AUDIT_ID_SUFFIX.length);
};

var mergeHistory = function(docs) {
  var result;
  docs.forEach(function(doc) {
    if (!result) {
      result = doc;
    } else {
      result.history = result.history.concat(doc.history);
    }
  });
  result.history = _.sortBy(result.history, 'timestamp');
  return result;
};

var mergeDupes = function(oldDocs) {
  var grouped = _.groupBy(oldDocs, 'record_id');
  return _.values(grouped).map(function(group) {
    if (group.length === 1) {
      return group[0];
    }
    return mergeHistory(group);
  });
};

var createNewDocs = function(oldDocs, callback) {
  var merged = mergeDupes(oldDocs);
  var ids = merged.map(getAuditId);
  db.audit.list({ keys: ids, include_docs: true }, function(err, results) {
    if (err) {
      return callback(err);
    }
    var found = results.rows.filter(function(row) {
      return row.doc;
    });
    found.forEach(function(row) {
      var dupe = _.findWhere(merged, { record_id: getRecordId(row.doc) });
      dupe.history = mergeHistory([ dupe, row.doc ]).history;
      dupe.auditRev = row.doc._rev;
    });
    var newDocs = merged.map(function(doc) {
      return {
        _id: getAuditId(doc),
        _rev: doc.auditRev,
        type: 'audit_record',
        history: doc.history
      };
    });
    db.audit.bulk({ docs: newDocs }, callback);
  });
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
    console.log('        Processing ' + skip + ' to ' + (skip + BATCH_SIZE) + ' docs of ' + result.total_rows + ' total');
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
  created: new Date(2016, 11, 1),
  run: function(callback) {
    dropView(function(err) {
      if (err) {
        return callback(err);
      }
      changeDocIds(callback);
    });
  }
};
