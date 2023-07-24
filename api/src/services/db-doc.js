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

const getDocCtx = (doc) => {
  if (!doc) {
    return;
  }

  return {
    doc,
    viewResults: authorization.getViewResults(doc)
  };
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

    return Promise
      .all([
        getStoredDoc(params, method, query, isAttachment),
        getRequestDoc(method, body, isAttachment),
      ])
      .then(([ storedDoc, requestDoc ]) => {
        if (!storedDoc && !requestDoc) {
          return false;
        }

        const stored = getDocCtx(storedDoc);
        const requested = getDocCtx(requestDoc);

        return authorization
          .getScopedAuthorizationContext(userCtx, [ stored, requested ])
          .then(authorizationContext => {
            // user must be allowed to see existent document
            if (stored && !authorization.allowedDoc(stored.doc._id, authorizationContext, stored.viewResults)) {
              return false;
            }

            // user must be allowed to see new/updated document or be allowed to create this document
            if (requested &&
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
      });
  },

  // db-doc GET requests with `open_revs` return a list of requested revisions of the requested doc id
  filterOfflineOpenRevsRequest: (userCtx, params, query) => {
    return getStoredDoc(params, 'GET', query).then(storedDocs => {
      const stored = storedDocs.map(storedDoc => getDocCtx(storedDoc.ok));

      return authorization
        .getScopedAuthorizationContext(userCtx, stored)
        .then(authorizationContext => {
          return stored
            .filter(storedDoc => {
              if (!storedDoc || !storedDoc.doc) {
                return false;
              }

              return authorization.allowedDoc(storedDoc.doc._id, authorizationContext, storedDoc.viewResults);
            })
            // return the expected response format [{ ok: <doc_json> }]
            .map(storedDoc => ({ ok: storedDoc.doc }));
        });
    });
  },
};
