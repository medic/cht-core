const db = require('../db');
const authorization = require('./authorization');
const _ = require('lodash');

const startKeyParams = ['startkey', 'start_key', 'startkey_docid', 'start_key_doc_id'];
const endKeyParams = ['endkey', 'end_key', 'endkey_docid', 'end_key_doc_id'];

const getRequestIds = (query, body) => {
  // CouchDB prioritizes query `keys` above body `keys`
  if (query && query.keys) {
    return query.keys;
  }

  if (body && body.keys) {
    return body.keys;
  }

  if (query && query.key) {
    return [ query.key ];
  }
};

const filterRequestIds = (allowedIds, requestIds, query) => {
  // if `key`/`keys` parameter is used, ignore `startKey`/`endKey` (CouchDB throws an error for such requests)
  if (requestIds) {
    return _.intersection(allowedIds, requestIds);
  }

  // support multiple startKey/endKey params in the same query, last one wins
  const startKeys = _.values(_.pickBy(query, (value, key) => startKeyParams.includes(key)));
  const endKeys = _.values(_.pickBy(query, (value, key) => endKeyParams.includes(key)));

  if (startKeys.length) {
    const startKey = _.last(startKeys);
    allowedIds = allowedIds.filter(docId => docId >= startKey);
  }

  if (endKeys.length) {
    const endKey = _.last(endKeys);
    if (Object.prototype.hasOwnProperty.call(query, 'inclusive_end') && !query.inclusive_end) {
      allowedIds = allowedIds.filter(docId => docId < endKey);
    } else {
      allowedIds = allowedIds.filter(docId => docId <= endKey);
    }
  }

  return allowedIds;
};

// fills in the "gaps" for forbidden docs
const stubSkipped = (requestIds, result) => {
  return requestIds.map(docId =>
    _.find(result, { id: docId }) || { id: docId, error: 'forbidden' }
  );
};

const formatResults = (results, requestIds) => {
  if (requestIds) {
    // if specific keys were requested, response rows should respect the order of request keys
    // and all of the requested keys should generate a response
    results.rows = stubSkipped(requestIds, results.rows);
  }

  return results;
};

// filters response from CouchDB only to include successfully read and allowed docs
const filterAllowedDocs = (authorizationContext, options) => {
  const allowedRow = row => {
    return row.doc &&
           authorization.allowedDoc(row.id, authorizationContext, authorization.getViewResults(row.doc));
  };

  return db.medic
    .allDocs(options)
    .then(results => results.rows.filter(allowedRow))
    .then(rows => ({ rows }));
};

const filterAllowedDocIds = (authorizationContext, options, query) => {
  return authorization
    .getAllowedDocIds(authorizationContext)
    .then(allowedDocIds => {
      // when specific keys are requested, the expectation is to send deleted documents as well
      const filteredIds = filterRequestIds(allowedDocIds, options.keys, query);

      if (!filteredIds.length) {
        return { rows: [] };
      }

      options.keys = filteredIds;

      return db.medic.allDocs(options);
    });
};

module.exports = {
  // offline users will only receive results for documents they are allowed to see
  // mimics CouchDB response format, stubbing forbidden docs when specific `keys` are requested
  filterOfflineRequest: (userCtx, query, body) => {
    const requestIds = getRequestIds(query, body);

    return authorization
      .getAuthorizationContext(userCtx)
      .then(authorizationContext => {
        // remove all the `startKey` / `endKey` / `key` params from the request options, as they are incompatible with
        // `keys` and their function is already handled
        const options = _.defaults({ keys: requestIds }, _.omit(query, 'key', ...startKeyParams, ...endKeyParams));
        const includeDocs = query && query.include_docs;

        // during replication, when PouchDB receives changes for docs on 1st rev, it will first request them with
        // an _all_docs with `include_docs=true&keys=<doc_ids>`.
        // querying `docs_by_replication_key` for users with many docs is slower than actually running the view map
        // functions over a reduced set of documents
        if (includeDocs && requestIds) {
          return filterAllowedDocs(authorizationContext, options);
        }

        return filterAllowedDocIds(authorizationContext, options, query);
      })
      .then(results => formatResults(results, requestIds));
  }
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  Object.assign(module.exports, {
    _filterRequestIds: filterRequestIds,
    _getRequestIds: getRequestIds,
    _filterAllowedDocs: filterAllowedDocs,
    _filterAllowedDocIds: filterAllowedDocIds
  });
}
