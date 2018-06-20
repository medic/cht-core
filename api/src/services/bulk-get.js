const authorization = require('./authorization'),
      db = require('../db-pouch'),
      _ = require('underscore'),
      serverUtils = require('../server-utils');

// filters response from CouchDB
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

const requestError = reason => ({
  error: 'bad_request',
  reason: reason
});

const invalidRequest = req => {
  if (!req.body) {
    return requestError('invalid UTF-8 JSON');
  }

  if (!req.body.docs) {
    return requestError('Missing JSON list of `docs`.');
  }

  if (!_.isArray(req.body.docs)) {
    return requestError('`docs` parameter must be an array.');
  }

  return false;
};

const filterOfflineRequest = (req, res) => {
  res.type('json');

  const error = invalidRequest(req);
  if (error) {
    res.write(JSON.stringify(error));
    return res.end();
  }

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
  // offline users will only receive `doc`-`rev` pairs they are allowed to see
  filterOfflineRequest: filterOfflineRequest,
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _invalidRequest: invalidRequest
  });
}
