const dbDoc = require('../services/db-doc'),
      _ = require('underscore'),
      serverUtils = require('../server-utils');

// block this middleware from processing requests to these endpoints
const RESERVED_ENDPOINTS = [
  '_all_docs',
  '_bulk_docs',
  '_bulk_get',
  '_changes',
  '_design'
];

const isValidRequest = (method, docId, body) => {
  if (['GET', 'POST', 'PUT', 'DELETE'].indexOf(method) === -1) {
    return false;
  }

  if (method === 'POST' && ( docId || !body )) {
    // POST requests with docId parameter or without a body are invalid
    return false;
  }

  if (method !== 'POST' && !docId) {
    //all other requests require the docId parameter
    return false;
  }

  return true;
};

const isValidAttachmentRequest = (params, query) => {
  if (params.attachmentId && !query.rev) {
    return false;
  }

  return true;
};

const requestError = (res, status) => {
  if (status === 404) {
    res.status(404);
    res.json({ error: 'bad_request', reason: 'Invalid rev format' });
    return;
  }

  res.status(403);
  res.json({ error: 'forbidden', reason: 'Insufficient privileges' });
};

module.exports = {
  request: (req, res, next) => {
    if (RESERVED_ENDPOINTS.indexOf(req.params.docId) !== -1) {
      return next('route');
    }

    // don't support attachment requests without `rev` parameter
    if (!isValidAttachmentRequest(req.params, req.query)) {
      return requestError(res, 404);
    }

    if (!isValidRequest(req.method, req.params.docId, req.body)) {
      return requestError(res);
    }

    return dbDoc
      .filterOfflineRequest(req.userCtx, req.params, req.method, req.query, req.body)
      .then(result => {
        if (!result) {
          return requestError(res);
        }

        if (_.isObject(result)) {
          // when `GET`-ing an allowed db-doc, respond directly
          return res.json(result);
        }

        next();
      })
      .catch(err => serverUtils.serverError(err, req, res));
  },

  requestDdoc: (appDdoc, req, res, next) => {
    // offline users are allowed to access app _rewrites, which are authorized by another route
    if (req.params.ddocId === appDdoc) {
      return next('route');
    }

    req.params.docId = `_design/${req.params.ddocId}`;
    return module.exports.request(req, res, next);
  }
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _isValidRequest: isValidRequest,
    _isValidAttachmentRequest: isValidAttachmentRequest
  });
}
