const db = require('../db-pouch'),
      authorization = require('./authorization'),
      _ = require('underscore'),
      serverUtils = require('../server-utils');

// block this middleware from processing requests to these endpoints
const RESERVED_ENDPOINTS = [
  '_all_docs',
  '_bulk_docs',
  '_bulk_get',
  '_changes'
];

const getStoredDoc = (req, isAttachment) => {
  if (!req.params || !req.params.docId) {
    return Promise.resolve(false);
  }

  const options = {};
  // get requested `rev` for `db-doc` GET requests and any `attachment` requests
  // `db-doc` PUT and DELETE requests will require last `rev` to be allowed
  if ((req.method === 'GET' || isAttachment) && req.query && req.query.rev) {
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

const getRequestDoc = (req, isAttachment) => {
  // bodyParser adds a `body` property regardless of method
  // attachment requests are not bodyParsed, so theoretically will not have a `body` property
  if (req.method === 'GET' || req.method === 'DELETE' || !req.body || isAttachment) {
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

  // offline users will only be able to:
  // - GET/DELETE `db-docs` they are allowed to see
  // - POST `db-docs` they will be allowed to see
  // - PUT `db-docs` they are and will be allowed to see
  // - GET/PUT/DELETE `attachments` of `db-docs` they are allowed to see
  // this filters audited endpoints, so valid requests are allowed to pass through to the next route
  filterOfflineRequest: (req, res, next) => {
    const isAttachment = req.params.attachmentId;
    if (!isAttachment) {
      res.type('json');
    }

    return Promise
      .all([
        getStoredDoc(req, isAttachment),
        getRequestDoc(req, isAttachment),
        authorization.getAuthorizationContext(req.userCtx)
      ])
      .then(([ storedDoc, requestDoc, authorizationContext ]) => {
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
