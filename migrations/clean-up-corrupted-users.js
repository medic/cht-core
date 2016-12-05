var doWhilst = require('async/doWhilst'),
    db = require('../db'),
    BATCH_SIZE = 100;

var update = function(docs, callback) {
  docs.forEach(function(doc) {
    delete doc.$promise;
    delete doc.$resolved;
  });
  db.medic.bulk({ docs: docs }, callback);
};

var needsUpdate = function(row) {
  return row.doc.hasOwnProperty('$promise') ||
         row.doc.hasOwnProperty('$resolved');
};

var fixUsers = function(skip, callback) {
  var options = {
    include_docs: true,
    limit: BATCH_SIZE,
    skip: skip,
    key: [ 'user-settings' ]
  };
  db.medic.view('medic-client', 'doc_by_type', options, function(err, result) {
    if (err) {
      return callback(err);
    }
    if (!result.rows || !result.rows.length) {
      // we've reached the end of the results
      return callback(null, null, false);
    }
    var corrupted = result.rows.filter(needsUpdate).map(function(row) {
      return row.doc;
    });
    if (!corrupted.length) {
      // no old docs in this batch
      return callback(null, skip + BATCH_SIZE, true);
    }
    update(corrupted, function(err) {
      callback(err, skip + BATCH_SIZE, true);
    });
  });
};

module.exports = {
  name: 'clean-up-corrupted-users',
  created: new Date(2016, 12, 5, 22, 0, 0, 0),
  run: function(callback) {
    var skip = 0;
    var again = true;
    doWhilst(
      function(callback) {
        fixUsers(skip, function(err, _skip, _again) {
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

  }
};
