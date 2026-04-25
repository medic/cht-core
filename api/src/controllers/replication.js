const replication = require('../services/replication');
const serverUtils = require('../server-utils');

module.exports = {
  getDocIds: async (req, res) => {
    try {
      const context = await replication.getContext(req.userCtx);
      const docIdsRevs = await replication.getDocIdsRevPairs(context.docIds);
      return res.json({
        doc_ids_revs: docIdsRevs,
        warn_docs: context.warnDocIds.length,
        last_seq: context.lastSeq,
        warn: context.warn,
        limit: context.limit,
      });
    } catch (err) {
      return serverUtils.serverError(err, req, res);
    }
  },
  getDocIdsToDelete: async (req, res) => {
    const docIds = req.body?.doc_ids;
    try {
      const docIdsToDelete = await replication.getDocIdsToDelete(req.userCtx, docIds);
      return res.json({ doc_ids: docIdsToDelete });
    } catch (err) {
      return serverUtils.serverError(err, req, res);
    }
  },

  /**
   * @openapi
   * /api/v1/replication/get-form/{formId}:
   *   get:
   *     summary: Get a form document for replication
   *     operationId: v1ReplicationGetForm
   *     description: >
   *       Returns a single form document by its internal ID. Attachment data is not included inline
   *       (only stubs), allowing clients to download large attachments separately and avoid
   *       timeouts during bulk replication on slow or unstable connections.
   *     tags: [Replication]
   *     parameters:
   *       - in: path
   *         name: formId
   *         required: true
   *         schema:
   *           type: string
   *         description: The internal ID of the form (without the `form:` prefix).
   *     responses:
   *       '200':
   *         description: The form document with attachment stubs
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties: true
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '404':
   *         $ref: '#/components/responses/NotFound'
   */
  getForm: async (req, res) => {
    const { formId } = req.params;
    if (!formId) {
      return serverUtils.error({ code: 400, message: 'Missing form ID' }, req, res);
    }
    try {
      const doc = await replication.getForm(formId);
      return res.json(doc);
    } catch (err) {
      if (err.status === 404) {
        return serverUtils.error({ code: 404, message: `Form not found: ${formId}` }, req, res);
      }
      return serverUtils.serverError(err, req, res);
    }
  },
};
