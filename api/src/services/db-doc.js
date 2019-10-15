const db = require('../db');
const authorization = require('./authorization');
const _ = require('lodash');

const getStoredDoc = (params, method, query, isAttachment) => {
  if (!params || !params.docId) {
    return Promise.resolve(false);
  }

  let options = {};
  // use `req.query` params for `db-doc` GET, as we will return the result directly if allowed
  // use `req.query.rev` for attachment requests
  // `db-doc` PUT and DELETE requests will require latest `rev` to be allowed
  if ((method === 'GET' || isAttachment) && query) {
    options = _.omit(query, 'latest');
  }

  return db.medic
    .get(params.docId, options)
    .catch(err => {
      if (err.status === 404) {
        return false;
      }

      throw err;
    });
};

const getRequestDoc = (method, body, isAttachment) => {
  // bodyParser adds a `body` property regardless of method
  // attachment requests are not bodyParsed, so theoretically will not have a `body` property
  if (method === 'GET' || method === 'DELETE' || isAttachment || !body) {
    return false;
  }

  return body;
};

module.exports = {
  // offline users will only be able to:
  // - GET/DELETE `db-docs` they are allowed to see
  // - POST `db-docs` they will be allowed to see
  // - PUT `db-docs` they are and will be allowed to see
  // - GET/PUT/DELETE `attachments` of `db-docs` they are allowed to see
  // this filters audited endpoints, so valid requests are allowed to pass through to the next route
  filterOfflineRequest: (userCtx, params, method, query, body) => {
    const isAttachment = params.attachmentId;
    let stored;
    let requested;

    return Promise
      .all([
        getStoredDoc(params, method, query, isAttachment),
        getRequestDoc(method, body, isAttachment),
      ])
      .then(([ storedDoc, requestDoc ]) => {
        stored = {
          doc: storedDoc,
          viewResults: authorization.getViewResults(storedDoc)
        };
        requested = {
          doc: requestDoc,
          viewResults: authorization.getViewResults(requestDoc)
        };

        return authorization.getMinimalAuthorizationContext(userCtx, [ stored, requested ]);
      })
      .then(authorizationContext => {
        if (!stored.doc && !requested.doc) {
          return false;
        }

        // user must be allowed to see existent document
        if (stored.doc &&
            !authorization.allowedDoc(stored.doc._id, authorizationContext, stored.viewResults) &&
            !authorization.isDeleteStub(stored.doc)) {
          return false;
        }

        // user must be allowed to see new/updated document or be allowed to create this document
        if (requested.doc &&
            !authorization.alwaysAllowCreate(requested.doc) &&
            !authorization.allowedDoc(requested.doc._id, authorizationContext, requested.viewResults)) {
          return false;
        }

        if (method === 'GET' && !isAttachment) {
          // we have already requested the doc with same query options
          return stored.doc;
        }

        return true;
      });
  },

  filterOfflineRequest11: (userCtx, params, method, query, body) => {
    const isAttachment = params.attachmentId;

    return Promise
      .all([
        getStoredDoc(params, method, query, isAttachment),
        getRequestDoc(method, body, isAttachment),
        authorization.getAuthorizationContext(userCtx)
      ])
      .then(([ storedDoc, requestDoc, authorizationContext ]) => {
        if (!storedDoc && !requestDoc) {
          return false;
        }

        // user must be allowed to see existent document
        if (storedDoc &&
            !authorization.allowedDoc(storedDoc._id, authorizationContext, authorization.getViewResults(storedDoc)) &&
            !authorization.isDeleteStub(storedDoc)) {
          return false;
        }

        // user must be allowed to see new/updated document or be allowed to create this document
        if (requestDoc &&
            !authorization.alwaysAllowCreate(requestDoc) &&
            !authorization.allowedDoc(requestDoc._id, authorizationContext, authorization.getViewResults(requestDoc))) {
          return false;
        }

        if (method === 'GET' && !isAttachment) {
          // we have already requested the doc with same query options
          return storedDoc;
        }

        return true;
      });
  },

  // db-doc GET requests with `open_revs` return a list of requested revisions of the requested doc id
  filterOfflineOpenRevsRequest: (userCtx, params, query) => {
    let stored;
    return getStoredDoc(params, 'GET', query)
      .then(storedDocs => {
        stored = storedDocs.map(storedDoc => ({
          doc: storedDoc.ok,
          viewResults: authorization.getViewResults(storedDoc.ok)
        }));
        return authorization.getMinimalAuthorizationContext(userCtx, stored);
      })
      .then(authorizationContext => {
        return stored
          .filter(storedDoc => {
            if (!storedDoc.doc) {
              return false;
            }

            return authorization.allowedDoc(storedDoc.doc._id, authorizationContext, storedDoc.viewResults) ||
                   authorization.isDeleteStub(storedDoc.doc);
          })
          .map(storedDoc => ({ ok: storedDoc.doc }));
      });
  },
  filterOfflineOpenRevsRequest11: (userCtx, params, query) => {
    return Promise
      .all([
        getStoredDoc(params, 'GET', query),
        authorization.getAuthorizationContext(userCtx)
      ])
      .then(([ storedDocs, authorizationContext ]) => {
        return storedDocs.filter(storedDoc => {
          if (!storedDoc.ok) {
            return false;
          }

          const viewResults = authorization.getViewResults(storedDoc.ok);
          return authorization.allowedDoc(storedDoc.ok._id, authorizationContext, viewResults) ||
                 authorization.isDeleteStub(storedDoc.ok);
        });
      });
  }
};
