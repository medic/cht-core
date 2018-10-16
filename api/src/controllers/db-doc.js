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

const isOpenRevsRequest = (method, query) => method === 'GET' && query && !!query.open_revs;

const permissionsError = res => {
  res.status(403);
  res.json({ error: 'forbidden', reason: 'Insufficient privileges' });
};

const notFoundError = res => {
  res.status(404);
  res.json({ error: 'bad_request', reason: 'Invalid rev format' });
};

module.exports = {
  request: (req, res, next) => {
    if (RESERVED_ENDPOINTS.indexOf(req.params.docId) !== -1) {
      return next('route');
    }

    if (!isValidRequest(req.method, req.params.docId, req.body)) {
      return permissionsError(res);
    }

    let promise;
    if (isOpenRevsRequest(req.method, req.query)) {
      promise = dbDoc.filterOfflineOpenRevsRequest(req.userCtx, req.params, req.query);
    } else {
      promise = dbDoc.filterOfflineRequest(req.userCtx, req.params, req.method, req.query, req.body);
    }

    return promise
      .then(result => {
        if (!result) {
          // if this is an attachment request without `rev` parameter that is not valid,
          // send a `404` so PouchDB will retry with a `rev` parameter.
          if (!isValidAttachmentRequest(req.params, req.query)) {
            return notFoundError(res);
          }

          return permissionsError(res);
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

    // offline users are blocked from accessing the admin-app
    if (req.params.ddocId === 'medic-admin') {
      return permissionsError(res);
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
