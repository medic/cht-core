const auth = require('../auth');
const bulkDocs = require('../services/bulk-docs');
const _ = require('lodash');
const serverUtils = require('../server-utils');

const requestError = reason => ({
  error: 'bad_request',
  reason: reason
});

const invalidRequest = req => {
  // error messages copied from CouchDB source
  if (!req.body) {
    return requestError('invalid UTF-8 JSON');
  }

  if (!req.body.docs) {
    return requestError('POST body must include `docs` parameter.');
  }

  if (!_.isArray(req.body.docs)) {
    return requestError('`docs` parameter must be an array.');
  }

  return false;
};

const interceptResponse = (requestDocs, req, res, response) => {
  response = JSON.parse(response);
  const formattedResults = bulkDocs.formatResults(requestDocs, req.body.docs, response);
  res.json(formattedResults);
};

module.exports = {
  bulkDelete: (req, res, next) => {
    return auth
      .check(req, ['can_edit'])
      .then(userCtx => {
        if (!auth.isOnlineOnly(userCtx)) {
          throw { code: 401, message: 'User is not an admin' };
        }
      })
      .then(() => bulkDocs.bulkDelete(req.body.docs, res, { batchSize: 50}))
      .catch(err => next(err));
  },

  request: (req, res, next) => {
    const error = invalidRequest(req);
    if (error) {
      res.status(400);
      return res.json(error);
    }

    return bulkDocs
      .filterOfflineRequest(req.userCtx, req.body.docs)
      .then(filteredDocs => {
        // results received from CouchDB need to be ordered to maintain same sequence as original `docs` parameter
        // and forbidden docs stubs must be added
        res.interceptResponse = _.partial(interceptResponse, req.body.docs);
        req.body.docs = filteredDocs;
        next();
      })
      .catch(err => serverUtils.serverError(err, req, res));
  }
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  Object.assign(module.exports, {
    _invalidRequest: invalidRequest,
    _interceptResponse: interceptResponse
  });
}
