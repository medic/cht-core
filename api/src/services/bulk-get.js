const authorization = require('./authorization'),
      db = require('../db-pouch'),
      _ = require('underscore'),
      serverUtils = require('../server-utils');

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

const filterOfflineRequest = (req, res) => {
  const authorizationContext = { userCtx: req.userCtx };
  return authorization
    .getUserAuthorizationData(req.userCtx)
    .then(authorizationData => {
      _.extend(authorizationContext, authorizationData);
      return db.medic.bulkGet(_.defaults({ docs: req.body.docs }, req.query));
    })
    .then(result => {
      result.results = filterResults(authorizationContext, result);

      res.write(JSON.stringify(result));
      res.end();
    })
    .catch(err => serverUtils.serverError(err, req, res));
};

module.exports = {
  filterOfflineRequest: filterOfflineRequest,
};
