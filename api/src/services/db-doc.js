const db = require('../db-pouch'),
      authorization = require('./authorization'),
      _ = require('underscore'),
      serverUtils = require('../server-utils'),
      RESERVED_ENDPOINTS = [
        '_all_docs',
        '_bulk_docs',
        '_bulk_get',
        '_changes'
      ];

const getStoredDoc = (req) => {
  if (!req.params || !req.params.docId) {
    return Promise.resolve(false);
  }

  const options = {};
  if (req.method === 'GET' && req.query && req.query.rev) {
    options.rev = req.query.rev;
  }

  return db.medic
    .get(req.params.docId, options)
    .catch(err => {
      if (err.status === 404) {
        return false;
      }

      throw err;
    });
};

const getRequestDoc = (req, attachment) => {
  if (!req.body || attachment) {
    return false;
  }

  return req.body;
};

const requestError = res => {
  res.status(403);
  res.send(JSON.stringify({ error: 'forbidden', reason: 'Insufficient privileges' }));
};

module.exports = {
  isValidRequest: (method, docId, body) => {
    if (RESERVED_ENDPOINTS.indexOf(docId) !== -1) {
      return false;
    }

    if (['GET', 'POST', 'PUT', 'DELETE'].indexOf(method) === -1) {
      return false;
    }

    if (method === 'POST' && ( docId || !body )) {
      // POST requests with docId parameter or without a body are invalid
      return false;
    }

    if (method !== 'POST' && !docId) {
      //all other requests need the docId parameter
      return false;
    }

    return true;
  },

  filterOfflineRequest: (req, res, next) => {
    const isAttachment = req.params.attachmentId;
    if (!isAttachment) {
      res.type('json');
    }

    return Promise
      .all([
        getStoredDoc(req),
        getRequestDoc(req, isAttachment),
        authorization.getUserAuthorizationData(req.userCtx)
      ])
      .then(([ storedDoc, requestDoc, authorizationContext ]) => {
        authorizationContext.userCtx = req.userCtx;

        if (!storedDoc && !requestDoc) {
          return requestError(res);
        }

        // user must be allowed to see existent document
        if (storedDoc &&
            !authorization.allowedDoc(storedDoc._id, authorizationContext, authorization.getViewResults(storedDoc))) {
          return requestError(res);
        }

        // user must be allowed to see new/updated document or be allowed to create only
        if (requestDoc &&
            !authorization.alwaysAllowCreate(requestDoc) &&
            !authorization.allowedDoc(requestDoc._id, authorizationContext, authorization.getViewResults(requestDoc))) {
          return requestError(res);
        }

        next();
      })
      .catch(err => serverUtils.serverError(err, req, res));
  },
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _getStoredDoc: getStoredDoc,
    _getRequestDoc: getRequestDoc
  });
}
