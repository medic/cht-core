const db = require('../db-pouch'),
      authorization = require('./authorization'),
      _ = require('underscore'),
      serverUtils = require('../server-utils');

const startKeyParams = ['startkey', 'start_key', 'startkey_docid', 'start_key_doc_id'];
const endKeyParams = ['endkey', 'end_key', 'endkey_docid', 'end_key_doc_id'];
const getRequestIds = (req) => {
  const keys = [];

  if (req.query && req.query.key) {
    keys.push(req.query.key);
  }

  if (req.method === 'GET') {
    if (req.query && req.query.keys) {
      return keys.concat(JSON.parse(req.query.keys));
    }
  }

  return keys.concat(req.body && req.body.keys || []);
};

const filterRequestIds = (allowedIds, requestIds, query) => {
  const startKeys = _.values(_.pick(query, (value, key) => startKeyParams.indexOf(key) !== -1));
  const endKeys = _.values(_.pick(query, (value, key) => endKeyParams.indexOf(key) !== -1));

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

  if (!requestIds.length) {
    return allowedIds;
  }

  return _.intersection(allowedIds, requestIds);
};

const stubSkipped = (requestIds, result) => {
  return requestIds.map(docId =>
    _.findWhere(result, { id: docId }) || { id: docId, error: 'forbidden' }
  );
};

const formatResults = (results, requestIds, res) => {
  if (requestIds.length) {
    // if specific keys were requested, response rows should respect the order of request keys
    // and all of the requested keys should generate a response
    results.rows = stubSkipped(requestIds, results.rows);
  }

  res.write(JSON.stringify(results));
  res.end();
};

const filterOfflineRequest = (req, res) => {
  res.type('json');

  return authorization
    .getUserAuthorizationData(req.userCtx)
    .then(authorizationData => {
      authorizationData.userCtx = req.userCtx;
      return authorization.getAllowedDocIds(authorizationData);
    })
    .then(allowedDocIds => {
      const requestIds = getRequestIds(req);
      allowedDocIds = requestIds.length ?
        authorization.convertTombstoneIds(allowedDocIds) : authorization.excludeTombstoneIds(allowedDocIds);

      const filteredIds = filterRequestIds(allowedDocIds, requestIds, req.query);

      // if specific ids's were requested, but none of them are allowed
      if (requestIds.length && !filteredIds.length) {
        return formatResults({ rows: [] }, requestIds, res);
      }

      const options = { keys: filteredIds };
      _.defaults(options, _.omit(req.query, 'key', ...startKeyParams, ...endKeyParams));

      return db.medic
        .allDocs(options)
        .then(results => formatResults(results, requestIds, res))
        .catch(err => serverUtils.serverError(err, req, res));
    })
    .catch(err => serverUtils.serverError(err, req, res));
};

module.exports = {
  filterOfflineRequest: filterOfflineRequest
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _filterRequestIds: filterRequestIds,
    _getRequestIds: getRequestIds
  });
}
