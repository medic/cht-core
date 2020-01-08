const doWhilst = require('async/doWhilst');
const {promisify} = require('util');
const db = require('../db');
const BATCH_SIZE = 100;

const update = function(docs, callback) {
  docs.forEach(function(doc) {
    delete doc.$promise;
    delete doc.$resolved;
  });
  db.medic.bulkDocs(docs, callback);
};

const needsUpdate = function(row) {
  return Object.prototype.hasOwnProperty.call(row.doc, '$promise') ||
         Object.prototype.hasOwnProperty.call(row.doc, '$resolved');
};

const fixUsers = function(skip, callback) {
  const options = {
    include_docs: true,
    limit: BATCH_SIZE,
    skip: skip,
    key: [ 'user-settings' ]
  };
  db.medic.query('medic-client/doc_by_type', options, function(err, result) {
    if (err) {
      return callback(err);
    }
    if (!result.rows || !result.rows.length) {
      // we've reached the end of the results
      return callback(null, null, false);
    }
    const corrupted = result.rows.filter(needsUpdate).map(function(row) {
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
  run: promisify(function(callback) {
    let skip = 0;
    let again = true;
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
      function(cb) {
        cb(null, again);
      },
      callback
    );

  })
};
