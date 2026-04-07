const authorization = require('./authorization');
const db = require('../db');
const _ = require('lodash');
const lineage = require('@medic/lineage')(Promise, db.medic);

// filters response from CouchDB only to include successfully read and allowed docs
const filterResults = (authorizationContext, result, hydratedMap) => {
  return result.results.filter(resultDocs => {
    resultDocs.docs = resultDocs.docs.filter(doc => {
      if (!doc.ok) {
        return false;
      }
      const hydratedDoc = hydratedMap.get(doc.ok._id);
      const viewResults = authorization.getViewResults(hydratedDoc || doc.ok);
      return authorization.allowedDoc(resultDocs.id, authorizationContext, viewResults);
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
        const docsToHydrate = _.compact(_.flatMap(result.results, r => r.docs.map(d => d.ok)));
        const clones = docsToHydrate.map(doc => _.cloneDeep(doc));
        return lineage.hydrateDocs(clones).then(() => {
          const hydratedMap = new WeakMap();
          docsToHydrate.forEach((doc, i) => hydratedMap.set(doc, clones[i]));
          result.results = filterResults(authorizationContext, result, hydratedMap);
          return result;
        });
      });
  },
};
