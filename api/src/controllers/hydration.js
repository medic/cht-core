const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const serverUtils = require('../server-utils');

/**
 * Returns an array of doc_ids to be hydrated or Boolean false if the request parameter is malformed.
 * Prioritizes query.doc_ids over body.doc_ids, following the model of CouchDB _all_docs
 * @param req the client request
 * @returns {(Boolean|Array)} returns Boolean false if the chosen param is not an array, otherwise returns the param
 */
const getDocIds = (req) => {
  const docIds = (req.query && req.query.doc_ids) ||
                 (req.body && req.body.doc_ids);

  return Array.isArray(docIds) && docIds;
};

const invalidParameterError = (res) => {
  res.status(400);
  return res.json({ error: 'bad_request', reason: '`doc_ids` parameter must be a json array.' });
};

/**
 * @typedef {Object} HydrationResult
 * @property {string} id - The document uuid
 * @property {string} [error] document "not_found" - only present when document is not found
 * @property {Object} [doc] hydrated document - only present when document is found
 */

/**
 * Formats the hydration response, following the model of CouchDB _all_docs:
 * - results are returned in the same order as they were requested
 * - results that were not found are marked with an error field
 * @param docIds - the list of requested doc_ids to be hydrated
 * @param hydratedDocs - the result of the hydration
 * @returns {HydrationResult[]}
 *
 */
const formatResponse = (docIds, hydratedDocs) => {
  return docIds.map(id => {
    const hydratedDoc = hydratedDocs.find(doc => doc._id === id);
    if (hydratedDoc) {
      return { id, doc: hydratedDoc };
    }

    return { id, error: 'not_found' };
  });
};

module.exports = {
  hydrate: (req, res) => {
    const docIds = getDocIds(req);
    if (!docIds) {
      return invalidParameterError(res);
    }

    if (!docIds.length) {
      return res.json([]);
    }

    if (docIds.length === 1) {
      return lineage
        .fetchHydratedDoc(docIds[0])
        .then(hydratedDoc => res.json(formatResponse(docIds, [hydratedDoc])))
        .catch(err => {
          if (err && err.status === 404) {
            return res.json(formatResponse(docIds, []));
          }

          return serverUtils.serverError(err, req, res);
        });
    }

    return db.medic
      .allDocs({ keys: docIds, include_docs: true })
      .then(result => {
        const docs = result.rows.map(row => row.doc).filter(doc => doc);
        if (!docs.length) {
          return [];
        }

        return lineage.hydrateDocs(docs);
      })
      .then(hydratedDocs => res.json(formatResponse(docIds, hydratedDocs)))
      .catch(err => serverUtils.serverError(err, req, res));
  },
};
