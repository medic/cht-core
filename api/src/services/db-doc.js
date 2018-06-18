const db = require('../db-pouch'),
      authorization = require('./authorization'),
      _ = require('underscore'),
      serverUtils = require('../server-utils');

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

const sendError = res => {
  res.type('json');
  res.status(403);
  res.send(JSON.stringify({ error: 'forbidden', reason: 'Insufficient privileges' }));
};

module.exports = {
  isValidRequest: (method, docId, body) => {
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

  filterRestrictedRequest: (req, res, next, attachment) => {
    return Promise
      .all([
        getStoredDoc(req),
        getRequestDoc(req, attachment),
        authorization.getUserAuthorizationData(req.userCtx)
      ])
      .then(([ storedDoc, requestDoc, authorizationContext ]) => {
        authorizationContext.userCtx = req.userCtx;

        if (!storedDoc && !requestDoc) {
          return sendError(res);
        }

        if (storedDoc &&
            !authorization.allowedDoc(storedDoc._id, authorizationContext, authorization.getViewResults(storedDoc))) {
          return sendError(res);
        }

        if (requestDoc &&
            !authorization.allowedDoc(requestDoc._id, authorizationContext, authorization.getViewResults(requestDoc))) {
          return sendError(res);
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
