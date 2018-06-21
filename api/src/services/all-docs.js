const db = require('../db-pouch'),
      authorization = require('./authorization'),
      _ = require('underscore'),
      serverUtils = require('../server-utils');

const startKeyParams = ['startkey', 'start_key', 'startkey_docid', 'start_key_doc_id'],
      endKeyParams = ['endkey', 'end_key', 'endkey_docid', 'end_key_doc_id'];

const getRequestIds = (req) => {
  if (req.query && req.query.keys) {
    return JSON.parse(req.query.keys);
  }

  if (req.body && req.body.keys) {
    return req.body.keys;
  }

  if (req.query && req.query.key) {
    return [ req.query.key ];
  }
};

const filterRequestIds = (allowedIds, requestIds, query) => {
  // if `key`/`keys` parameter is used, ignore `startKey`/`endKey` (CouchDB throws an error for such requests)
  if (requestIds) {
    return _.intersection(allowedIds, requestIds);
  }

  // support multiple startKey/endKey params in the same query, last one wins
  const startKeys = _.values(_.pick(query, (value, key) => startKeyParams.indexOf(key) !== -1)),
        endKeys = _.values(_.pick(query, (value, key) => endKeyParams.indexOf(key) !== -1));

  if (startKeys.length) {
    const startKey = _.last(startKeys);
    allowedIds = allowedIds.filter(docId => docId >= startKey);
  }

  if (endKeys.length) {
    const endKey = _.last(endKeys);
    if (query.inclusive_end === 'false') {
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
    _.findWhere(result, { id: docId }) || { id: docId, error: 'forbidden' }
  );
};

const formatResults = (results, requestIds, res) => {
  if (requestIds) {
    // if specific keys were requested, response rows should respect the order of request keys
    // and all of the requested keys should generate a response
    results.rows = stubSkipped(requestIds, results.rows);
  }

  res.write(JSON.stringify(results));
  res.end();
};

const requestError = reason => ({
  error: 'bad_request',
  reason: reason
});

const invalidRequest = req => {
  if (req.query && req.query.keys) {
    try {
      const keys = JSON.parse(req.query.keys);
      if (!_.isArray(keys)) {
        return requestError('`keys` parameter must be an array.');
      }
    } catch (err) {
      return requestError('invalid UTF-8 JSON');
    }
  }

  if (req.method === 'POST' && req.body.keys && !_.isArray(req.body.keys)) {
    return requestError('`keys` body member must be an array.');
  }

  return false;
};

module.exports = {
  // offline users will only receive results for documents they are allowed to see
  // mimics CouchDB response format, stubbing forbidden docs when specific `keys` are requested
  filterOfflineRequest: (req, res) => {
    res.type('json');

    const error = invalidRequest(req);
    if (error) {
      res.write(JSON.stringify(error));
      return res.end();
    }

    const requestIds = getRequestIds(req);

    return authorization
      .getUserAuthorizationData(req.userCtx)
      .then(authorizationData => {
        authorizationData.userCtx = req.userCtx;
        return authorization.getAllowedDocIds(authorizationData);
      })
      .then(allowedDocIds => {
        // when specific keys are requested, the expectation is to send deleted documents as well
        allowedDocIds = requestIds ?
          authorization.convertTombstoneIds(allowedDocIds) : authorization.excludeTombstoneIds(allowedDocIds);

        const filteredIds = filterRequestIds(allowedDocIds, requestIds, req.query);

        // when specific keys were requested, but none of them are allowed
        if (requestIds && !filteredIds.length) {
          return formatResults({ rows: [] }, requestIds, res);
        }

        // remove all the `startKey` / `endKey` / `key` params from the request options, as they are incompatible with
        // `keys` and their function is already handled
        const options = _.defaults({ keys: filteredIds }, _.omit(req.query, 'key', ...startKeyParams, ...endKeyParams));
        return db.medic.allDocs(options);
      })
      .then(results => formatResults(results, requestIds, res))
      .catch(err => serverUtils.serverError(err, req, res));
  }
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _filterRequestIds: filterRequestIds,
    _getRequestIds: getRequestIds,
    _invalidRequest: invalidRequest
  });
}
