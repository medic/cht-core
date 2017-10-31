const async = require('async'),
      _ = require('underscore'),
      db = require('../db'),
      DEFAULT_BATCH_LIMIT = 100; // 100 is a good compromise of performance and stability

const runBatch = (ddocName, viewName, viewParams, iteratee, callback) => {
  db.medic.view(ddocName, viewName, viewParams, (err, response) => {
    if (err) {
      return callback(err);
    }
    console.log(`        Processing doc ${response.offset}`);
    let nextPage;
    if (response.rows.length === viewParams.limit) {
      const lastRow = response.rows.pop();
      nextPage = {
        startkey: lastRow.key,
        startkey_docid: lastRow.id
      };
    }
    const docs = response.rows.map(row => row.doc);
    iteratee(docs, err => {
      callback(err, nextPage);
    });
  });
};

/**
 * Run an operation over all documents returned from the query in batches.
 *
 * ddocName (string)    Name of the ddoc the view is defined in.
 * viewName (string)    Name of the view.
 * viewParams (object)  Parameters to pass to the view query.
 *  - `limit` defaults to 100 and can be overriden.
 *  - `include_docs` defaults to `true` and cannot be overriden.
 *  - `startkey` and `startkey_docid` cannot be overriden.
 * iteratee (function)  Called to process an array of docs then invoke the given callback.
 * callback (function)  Called on error or when all docs have been processed.
 */
module.exports.view = (ddocName, viewName, viewParams, iteratee, callback) => {
  // add 1 so we know where to start from next iteration
  viewParams.limit = (viewParams.limit || DEFAULT_BATCH_LIMIT) + 1;
  viewParams.include_docs = true;
  async.doWhilst(
    callback => runBatch(ddocName, viewName, viewParams, iteratee, callback),
    nextPage => {
      if (!nextPage) {
        return false;
      }
      viewParams = _.defaults(nextPage, viewParams);
      return true;
    },
    callback
  );
};
