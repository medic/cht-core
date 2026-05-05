const auth = require('../auth');
const bulkDocs = require('../services/bulk-docs');
const _ = require('lodash');
const serverUtils = require('../server-utils');

const requestError = reason => ({
  error: 'bad_request',
  reason: reason
});

const invalidRequest = req => {
  // error messages copied from CouchDB source
  if (!req.body) {
    return requestError('invalid UTF-8 JSON');
  }

  if (!req.body.docs) {
    return requestError('POST body must include `docs` parameter.');
  }

  if (!_.isArray(req.body.docs)) {
    return requestError('`docs` parameter must be an array.');
  }

  return false;
};

const interceptResponse = (requestDocs, req, res, response) => {
  return bulkDocs.formatResults(requestDocs, req.body.docs, response);
};

/**
 * @openapi
 * tags:
 *   - name: Bulk
 *     description: Bulk document operations
 */
module.exports = {
  /**
   * @openapi
   * /api/v1/bulk-delete:
   *   post:
   *     summary: Bulk delete documents
   *     operationId: v1BulkDeletePost
   *     description: |
   *       Bulk delete endpoint for deleting large numbers of documents. Docs are batched into groups
   *       of 100 and sent sequentially to CouchDB. The response is chunked JSON (one batch at a
   *       time), so to get an indication of progress incomplete JSON must be parsed with a library such as
   *       [`partial-json-parser`](https://github.com/indgov/partial-json-parser).
   *
   *       ### Errors
   *
   *       If an error is encountered part-way through the response (eg on the third batch), it’s impossible to send
   *       new headers to indicate a 5xx error, so the connection will simply be terminated (as recommended here
   *       https://github.com/expressjs/express/issues/2700).
   *     tags: [Bulk]
   *     x-permissions:
   *       hasAll: [can_edit]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [docs]
   *             properties:
   *               docs:
   *                 type: array
   *                 description: Array of objects each with an `_id` property.
   *                 items:
   *                   type: object
   *                   additionalProperties: true
   *                   required: [_id]
   *                   properties:
   *                     _id:
   *                       type: string
   *     responses:
   *       '200':
   *         description: >
   *           Chunked JSON response. Each chunk is an array of results for a batch of deletions.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     ok:
   *                       type: boolean
   *                     id:
   *                       type: string
   *                     rev:
   *                       type: string
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  bulkDelete: (req, res, next) => {
    return auth
      .check(req, ['can_edit'])
      .then(userCtx => {
        if (!auth.isOnlineOnly(userCtx)) {
          throw { code: 401, message: 'User is not an admin' };
        }
      })
      .then(() => bulkDocs.bulkDelete(req.body.docs, res, { batchSize: 50}))
      .catch(err => next(err));
  },

  request: (req, res, next) => {
    const error = invalidRequest(req);
    if (error) {
      res.status(400);
      return res.json(error);
    }

    return bulkDocs
      .filterOfflineRequest(req.userCtx, req.body.docs)
      .then(filteredDocs => {
        // results received from CouchDB need to be ordered to maintain same sequence as original `docs` parameter
        // and forbidden docs stubs must be added
        res.interceptResponse = _.partial(interceptResponse, req.body.docs);
        req.body.docs = filteredDocs;
        next();
      })
      .catch(err => serverUtils.serverError(err, req, res));
  }
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  Object.assign(module.exports, {
    _invalidRequest: invalidRequest,
    _interceptResponse: interceptResponse
  });
}
