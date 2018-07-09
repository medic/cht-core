const authorization = require('./authorization'),
      db = require('../db-pouch'),
      _ = require('underscore');

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
  filterOfflineRequest: (req) => {
    let authorizationContext;

    return authorization
      .getAuthorizationContext(req.userCtx)
      .then(context => {
        authorizationContext = context;
        // actually execute the _bulk_get request as-is and filter the response
        return db.medic.bulkGet(_.defaults({ docs: req.body.docs }, req.query));
      })
      .then(result => {
        result.results = filterResults(authorizationContext, result);
        return result;
      });
  },
};
