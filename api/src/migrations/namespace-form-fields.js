// For `data_records`, moves form fields from `doc.my_field` to `doc.fields.my_field`.

const async = require('async');
const _ = require('lodash');
const { promisify } = require('util');
const db = require('../db');
const logger = require('@medic/logger');
const settingsService = require('../services/settings');
let forms;

const BATCH_SIZE = 100;

const namespace = function(docs, callback) {
  docs.forEach(function(doc) {
    if (doc.fields || !doc.form) {
      return;
    }
    const form = forms[doc.form];
    if (!form) {
      return;
    }
    doc.fields = {};
    _.keys(form.fields).forEach(function(key) {
      doc.fields[key] = doc[key];
      delete doc[key];
    });
  });

  db.medic.bulkDocs(docs, function(err, results) {
    if (err) {
      return callback(err);
    }

    if (results && results.length) {
      const errors = [];
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

const runBatch = function(batchSize, skip, callback) {
  const options = {
    key: ['data_record'],
    include_docs: true,
    limit: batchSize,
    skip: skip,
  };
  db.medic.query('medic-client/doc_by_type', options, function(err, result) {
    if (err) {
      return callback(err);
    }
    logger.info(`        Processing ${skip} to (${skip + batchSize}) docs of ${result.total_rows} total`);
    const docs = _.uniq(_.map(result.rows, 'doc'));

    namespace(docs, function(err) {
      const keepGoing = result.total_rows > skip + batchSize;
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

        let currentSkip = 0;
        let keepGoing = true;
        async.doWhilst(
          function(callback) {
            runBatch(batchSize, currentSkip, (err, again) => {
              if (err) {
                return callback(err);
              }
              keepGoing = again;
              callback();
            });
          },
          function(cb) {
            currentSkip += batchSize;
            return cb(null, keepGoing);
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
