const url = require('url');
const path = require('path');
const request = require('request-promise-native');
const environment = require('./environment');
const logger = require('./logger');
const DEFAULT_BATCH_LIMIT = 100; // 100 is a good compromise of performance and stability

const runBatch = (ddoc, view, viewParams, iteratee) => {
  const fullUrl = url.format({
    protocol: environment.protocol,
    hostname: environment.host,
    port: environment.port,
    pathname: path.join(environment.db, '_design', ddoc, '_view', view),
    query: viewParams,
  });
  // using request here instead of PouchDB because
  // PouchDB doesn't support startkey_docid: #5319
  return request.get({
    url: fullUrl,
    json: true,
    auth: { user: environment.username, pass: environment.password },
  })
    .then(result => {
      logger.info(`        Processing doc ${result.offset}`);
      let nextPage;
      if (result.rows.length === viewParams.limit) {
        const lastRow = result.rows.pop();
        nextPage = {
          startkey: JSON.stringify(lastRow.key),
          startkey_docid: lastRow.id,
        };
      }
      const docs = result.rows.map(row => row.doc);
      return iteratee(docs).then(() => {
        if (nextPage) {
          return runBatch(ddoc, view, Object.assign({}, viewParams, nextPage), iteratee);
        }
        // else we've done the last batch
      });
    });
};

/**
 * Run an operation over all documents returned from the query in batches.
 *
 * viewName (string)    Name of the view, eg: "medic-client/doc_by_type".
 * viewParams (object)  Parameters to pass to the view query.
 *  - `limit` defaults to 100 and can be overriden.
 *  - `include_docs` defaults to `true` and cannot be overriden.
 *  - `startkey` and `startkey_docid` cannot be overriden.
 * iteratee (function)  Called to process an array of docs then invoke the given callback.
 */
module.exports.view = (viewName, viewParams, iteratee) => {
  const [ddoc, view] = viewName.split('/');
  viewParams.key = JSON.stringify(viewParams.key);
  // add 1 so we know where to start from next iteration
  viewParams.limit = (viewParams.limit || DEFAULT_BATCH_LIMIT) + 1;
  viewParams.include_docs = true;
  return Promise.resolve().then(() => {
    return runBatch(ddoc, view, viewParams, iteratee);
  });
};
