const authorization = require('./authorization');
const db = require('../db');
const _ = require('lodash');

// filters response from CouchDB only to include successfully read and allowed docs
const filterResults = (authorizationContext, result) => {
  return result.results.filter(resultDocs => {
    resultDocs.docs = resultDocs.docs.filter(doc => {
      if (!doc.ok) {
        return false;
      }
      return authorization.allowedDoc(resultDocs.id, authorizationContext, authorization.getViewResults(doc.ok));
    });
    return resultDocs.docs.length;
  });
};

module.exports = {
  // offline users will only receive `doc`+`rev` pairs they are allowed to see
  filterOfflineRequest: (userCtx, query, docs) => {
    let authorizationContext;

    return authorization
      .getAuthorizationContext(userCtx)
      .then(context => {
        authorizationContext = context;
        // actually execute the _bulk_get request as-is, excluding `latest` param, and filter the response
        return db.medic.bulkGet(_.defaults({ docs: docs }, _.omit(query, 'latest')));
      })
      .then(result => {
        result.results = filterResults(authorizationContext, result);
        return result;
      });
  },
};
