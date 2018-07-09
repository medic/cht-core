const db = require('../db-pouch'),
      authorization = require('./authorization'),
      _ = require('underscore');


const getStoredDoc = (req, isAttachment) => {
  if (!req.params || !req.params.docId) {
    return Promise.resolve(false);
  }

  let options = {};
  // use `req.query` params for `db-doc` GET, as we will return the result directly if allowed
  // use `req.query.rev` for attachment requests
  // `db-doc` PUT and DELETE requests will require latest `rev` to be allowed
  if ((req.method === 'GET' || isAttachment) && req.query) {
    options = req.query;
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
  if (req.method === 'GET' || req.method === 'DELETE' || isAttachment || !req.body) {
    return false;
  }

  return req.body;
};

module.exports = {
  // offline users will only be able to:
  // - GET/DELETE `db-docs` they are allowed to see
  // - POST `db-docs` they will be allowed to see
  // - PUT `db-docs` they are and will be allowed to see
  // - GET/PUT/DELETE `attachments` of `db-docs` they are allowed to see
  // this filters audited endpoints, so valid requests are allowed to pass through to the next route
  filterOfflineRequest: (req) => {
    const isAttachment = req.params.attachmentId;

    return Promise
      .all([
        getStoredDoc(req, isAttachment),
        getRequestDoc(req, isAttachment),
        authorization.getAuthorizationContext(req.userCtx)
      ])
      .then(([ storedDoc, requestDoc, authorizationContext ]) => {
        if (!storedDoc && !requestDoc) {
          return false;
        }

        // user must be allowed to see existent document
        if (storedDoc &&
            !authorization.allowedDoc(storedDoc._id, authorizationContext, authorization.getViewResults(storedDoc))) {
          return false;
        }

        // user must be allowed to see new/updated document or be allowed to create this document
        if (requestDoc &&
            !authorization.alwaysAllowCreate(requestDoc) &&
            !authorization.allowedDoc(requestDoc._id, authorizationContext, authorization.getViewResults(requestDoc))) {
          return false;
        }

        if (req.method === 'GET' && !isAttachment) {
          // we have already requested the doc with same query options
          return storedDoc;
        }

        return true;
      });
  },
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _getStoredDoc: getStoredDoc,
    _getRequestDoc: getRequestDoc
  });
}
