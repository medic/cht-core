var _ = require('underscore'),
    db = require('../db'),
    async = require('async');

var VIEW_BATCH_SIZE = 10000;
var DOC_BATCH_SIZE = 100;
var PERCENT_REPORT_CHUNKS = 10;

// Copied from https://github.com/node-browser-compat/btoa/blob/master/index.js
// because why import a library for one tiny function
function btoa(str) {
  var buffer;

  if (str instanceof Buffer) {
    buffer = str;
  } else {
    buffer = new Buffer(str.toString(), 'binary');
  }

  return buffer.toString('base64');
}

var attachmentIse = function(record) {
  // XML forms which have not been migrated yet
  if (record.content_type === 'xml' && record.content) {
    record._attachments = record._attachments || {};
    record._attachments.content = {
      content_type: 'application/xml',
      data: btoa(record.content)
    };
    delete record.content;

    return record;
  }
};


var incrementPercentTarget = function(percentTarget) {
  return percentTarget + PERCENT_REPORT_CHUNKS;
};

module.exports = {
  name: 'extract-data-record-content',
  created: new Date(2017, 2, 3),
  run: function(migrationCallback) {
    var totalRecords;
    var processed = 0;
    var nextPercentTarget = incrementPercentTarget(0);

    console.log('Finding data records...');
    async.doUntil(
      function(viewCallback) {
        db.medic.view('medic', 'data_records', {
          skip: processed,
          limit: VIEW_BATCH_SIZE
        },
        function(err, body) {
          if (err) {
            return migrationCallback(err);
          }

          if (!totalRecords) {
            // First view batch print headers
            totalRecords = body.total_rows;
            console.log('Migrating up to ' + totalRecords + ' rows');
            process.stdout.write('Working');

            if (totalRecords === 0) {
              // Short-circuit if there is nothing on this server
              viewCallback();
            }
          } else {
            process.stdout.write(',');
          }

          var recordStubs = body.rows;

          async.doUntil(
            function(docCallback) {
              process.stdout.write('.');

              var batch = recordStubs.splice(0, DOC_BATCH_SIZE);
              processed += batch.length;

              // Percent indication
              var completedPercent = (processed / totalRecords) * 100;
              if (completedPercent >= nextPercentTarget) {
                process.stdout.write('[' + Math.floor(completedPercent) + '%]');
                nextPercentTarget = incrementPercentTarget(nextPercentTarget);
              }

              db.medic.fetch({keys: _.pluck(batch, 'id')}, function(err, results) {
                if (err) {
                  return migrationCallback(err);
                }
                var docs = _.pluck(results.rows, 'doc');

                docs = docs.map(attachmentIse).filter(function(i) {
                  return i;
                });

                if (docs.length === 0) {
                  // The view we're using gets all data records, not just XML ones
                  // so there is a good chance entire batches will be filtered out
                  // TODO: when we upgrade to CouchDB2.0 this is a great place to use
                  //       mango filters to target XML forms better
                  return docCallback();
                }

                db.medic.bulk({docs: docs}, docCallback);
              });
            },
            function() {
              return recordStubs.length === 0;
            },
            function(err) {
              if (err) {
                return migrationCallback(err);
              }

              return viewCallback();
            }
          );
        });
      },
      function() {
        return processed >= totalRecords;
      },
      function(err) {
        if (err) {
          return migrationCallback(err);
        }

        process.stdout.write('\n');
        return migrationCallback();
      }
    );
  }
};
