const db = require('../db');
const lineageFactory = require('@medic/lineage');
const serverUtils = require('../server-utils');

const lineage = lineageFactory(Promise, db.medic);

module.exports = {
  hydrate: (req, res) => {
    const docIds = Array.isArray(req.body) ? req.body : [req.body];

    if (docIds.length === 1) {
      return lineage.fetchHydratedDoc(docIds[0])
        .then(hydratedDoc => res.json(hydratedDoc))
        .catch(err => serverUtils.serverError(err, req, res));
    }

    return db.medic.allDocs({keys: docIds, include_docs: true})
      .then(result => {
        const docs = result.rows.map(r => r.doc);
        return lineage.hydrateDocs(docs)
          .then(hydratedDocs => res.json(hydratedDocs));
      })
      .catch(err => serverUtils.serverError(err, req, res));
  }
};
