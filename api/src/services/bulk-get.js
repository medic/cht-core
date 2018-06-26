const authorization = require('./authorization'),
      db = require('../db-pouch'),
      _ = require('underscore'),
      serverUtils = require('../server-utils');

// filters response from CouchDB only to include successfully read and allowed docs
// PouchDB uses this endpoint for replication
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

module.exports = {
  // offline users will only receive `doc`+`rev` pairs they are allowed to see
  filterOfflineRequest: (req, res) => {
    res.type('json');

    const error = invalidRequest(req);
    if (error) {
      res.write(JSON.stringify(error));
      return res.end();
    }

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

        res.write(JSON.stringify(result));
        res.end();
      })
      .catch(err => serverUtils.serverError(err, req, res));
  },
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _invalidRequest: invalidRequest
  });
}
