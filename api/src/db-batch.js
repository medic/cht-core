const db = require('./db');
const logger = require('./logger');
const DEFAULT_BATCH_LIMIT = 100; // 100 is a good compromise of performance and stability

const runBatch = (viewName, viewParams, iteratee) => {
  return db.medic.query(viewName, viewParams).then(result => {
    logger.info(`        Processing doc ${result.offset}`);
    let nextPage;
    if (result.rows.length === viewParams.limit) {
      const lastRow = result.rows.pop();
      nextPage = {
        startkey: lastRow.key,
        startkey_docid: lastRow.id,
      };
    }
    const docs = result.rows.map(row => row.doc);
    return iteratee(docs).then(() => {
      if (nextPage) {
        return runBatch(viewName, Object.assign({}, viewParams, nextPage), iteratee);
      }
      // else we've done the last batch
    });
  });
};

/**
 * Run an operation over all documents returned from the query in batches.
 *
 * viewName (string)    Name of the view.
 * viewParams (object)  Parameters to pass to the view query.
 *  - `limit` defaults to 100 and can be overriden.
 *  - `include_docs` defaults to `true` and cannot be overriden.
 *  - `startkey` and `startkey_docid` cannot be overriden.
 * iteratee (function)  Called to process an array of docs then invoke the given callback.
 */
module.exports.view = (viewName, viewParams, iteratee) => {
  // add 1 so we know where to start from next iteration
  viewParams.limit = (viewParams.limit || DEFAULT_BATCH_LIMIT) + 1;
  viewParams.include_docs = true;
  return Promise.resolve().then(() => {
    return runBatch(viewName, viewParams, iteratee);
  });
};
