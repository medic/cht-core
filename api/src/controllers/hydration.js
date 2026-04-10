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
  const docIds = (req.parsedQuery && req.parsedQuery.doc_ids) ||
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

/**
 * @openapi
 * components:
 *   schemas:
 *     HydrationResult:
 *       type: object
 *       required: [id]
 *       properties:
 *         id:
 *           type: string
 *           description: The document uuid.
 *         doc:
 *           type: object
 *           additionalProperties: true
 *           description: The fully hydrated document. Present when the document is found.
 *         error:
 *           type: string
 *           description: '"not_found" when the document is not found.'
 */
module.exports = {
  /**
   * @openapi
   * /api/v1/hydrate:
   *   get:
   *     summary: Hydrate documents by id (GET)
   *     operationId: v1HydrateGet
   *     description: >
   *       Accepts a JSON array of document uuids and returns fully hydrated documents, in the same
   *       order in which they were requested. When documents are not found, an entry with the
   *       missing uuid and an error is added instead.
   *     tags: [Bulk]
   *     parameters:
   *       - in: query
   *         name: doc_ids
   *         required: true
   *         description: A JSON-encoded array of document uuids.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: string
   *             example: ["id1", "id2", "id3"]
   *     responses:
   *       '200':
   *         description: Hydrated documents
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/HydrationResult'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *   post:
   *     summary: Hydrate documents by id (POST)
   *     operationId: v1HydratePost
   *     description: >
   *       Accepts a JSON array of document uuids and returns fully hydrated documents, in the same
   *       order in which they were requested. When documents are not found, an entry with the
   *       missing uuid and an error is added instead.
   *     tags: [Bulk]
   *     x-permissions:
   *       isOnline: true
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [doc_ids]
   *             properties:
   *               doc_ids:
   *                 type: array
   *                 description: A JSON array of document uuids.
   *                 items:
   *                   type: string
   *     responses:
   *       '200':
   *         description: Hydrated documents
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/HydrationResult'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  hydrate: (req, res) => {
    const docIds = getDocIds(req);
    if (!docIds) {
      return invalidParameterError(res);
    }

    if (!docIds.length) {
      return res.json([]);
    }

    return lineage
      .fetchHydratedDocs(docIds)
      .then(hydratedDocs => res.json(formatResponse(docIds, hydratedDocs)))
      .catch(err => serverUtils.serverError(err, req, res));
  },
};
