/**
 * For `data_records`, moves form fields from `doc.my_field` to `doc.fields.my_field`.
 */

var async = require('async'),
  _ = require('underscore'),
  { promisify } = require('util'),
  db = require('../db-nano'),
  logger = require('../logger'),
  settingsService = require('../services/settings'),
  forms;

var BATCH_SIZE = 100;

var namespace = function(docs, callback) {
  docs.forEach(function(doc) {
    if (doc.fields || !doc.form) {
      return;
    }
    var form = forms[doc.form];
    if (!form) {
      return;
    }
    doc.fields = {};
    _.keys(form.fields).forEach(function(key) {
      doc.fields[key] = doc[key];
      delete doc[key];
    });
  });

  db.medic.bulk({ docs: docs }, function(err, results) {
    if (err) {
      return callback(err);
    }

    if (results && results.length) {
      var errors = [];
      results.forEach(function(result) {
        if (!result.ok) {
          errors.push(new Error(result.error + ' - ' + result.reason));
        }
      });

      if (errors.length) {
        return callback(
          new Error('Bulk create errors: ' + JSON.stringify(errors, null, 2))
        );
      }
    }

    callback();
  });
};

var runBatch = function(batchSize, skip, callback) {
  var options = {
    key: ['data_record'],
    include_docs: true,
    limit: batchSize,
    skip: skip,
  };
  db.medic.view('medic-client', 'doc_by_type', options, function(err, result) {
    if (err) {
      return callback(err);
    }
    logger.info(
      `        Processing 
        ${skip} 
         to  
        (${skip + batchSize}) 
         docs of  
        ${result.total_rows} 
        ' total`
    );
    var docs = _.uniq(_.pluck(result.rows, 'doc'));

    namespace(docs, function(err) {
      var keepGoing = result.total_rows > skip + batchSize;
      callback(err, keepGoing);
    });
  });
};

module.exports = {
  name: 'namespace-form-fields',
  created: new Date(2015, 5, 19, 10, 30, 0, 0),
  // Exposed for testing.
  _runWithBatchSize: function(batchSize, callback) {
    settingsService
      .get()
      .then(settings => {
        forms = settings.forms;

        var currentSkip = 0;
        async.doWhilst(
          function(callback) {
            runBatch(batchSize, currentSkip, callback);
          },
          function(keepGoing) {
            currentSkip += batchSize;
            return keepGoing;
          },
          callback
        );
      })
      .catch(callback);
  },
  run: promisify(function(callback) {
    module.exports._runWithBatchSize(BATCH_SIZE, callback);
  }),
};
