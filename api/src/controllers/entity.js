const { Entity, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const auth = require('../auth');

const getEntity = ctx.bind(Entity.v1.get);

/**
 * @openapi
 * tags:
 *   - name: Entity
 *     description: Operations for generic database documents
 */
module.exports = {
  /**
   * @openapi
   * /api/v1/entity/{id}:
   *   get:
   *     summary: Get a document by id
   *     operationId: v1EntityIdGet
   *     description: Returns a generic database document from the medic database.
   *     tags: [Entity]
   *     x-since: 5.2.0
   *     x-permissions:
   *       isOnline: true
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The id of the document to retrieve
   *     responses:
   *       '200':
   *         description: The document
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *       '404':
   *         $ref: '#/components/responses/NotFound'
   */
  get: serverUtils.doOrError(async (req, res) => {
    await auth.assertPermissions(req, { isOnline: true });
    const docId = req.params.id;
    if (!docId) {
      return serverUtils.error({ status: 400, message: 'Missing id' }, req, res);
    }

    const doc = await getEntity(Qualifier.byUuid(docId));

    if (!doc) {
      return serverUtils.error({ status: 404, message: 'Document not found' }, req, res);
    }

    return res.json(doc);
  }),
};
