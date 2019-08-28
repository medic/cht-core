const allDocs = require('../services/all-docs'),
      serverUtils = require('../server-utils'),
      _ = require('underscore');

const requestError = reason => ({
  error: 'bad_request',
  reason: reason
});

const invalidRequest = req => {
  // error messages copied from CouchDB source
  if (req.query && req.query.keys) {
    if (!_.isArray(req.query.keys)) {
      return requestError('`keys` parameter must be an array.');
    }
  }

  if (req.method === 'POST' && req.body.keys && !_.isArray(req.body.keys)) {
    return requestError('`keys` body member must be an array.');
  }

  return false;
};

module.exports = {
  request: (req, res) => {
    const error = invalidRequest(req);
    if (error) {
      res.status(400);
      return res.json(error);
    }

    return allDocs
      .filterOfflineRequest(req.userCtx, req.query, req.body)
      .then(results => res.json(results))
      .catch(err => serverUtils.serverError(err, req, res));
  }
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _invalidRequest: invalidRequest
  });
}
