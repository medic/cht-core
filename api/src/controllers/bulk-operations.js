const service = require('../services/bulk-operations');
const serverUtils = require('../server-utils');
const auth = require('../auth');

module.exports = {
  v1: {
    /**
     * @openapi
     * /api/v1/bulk-operations/{id}:
     *   get:
     *     summary: Get the status of a bulk operation
     *     operationId: v1BulkOperationIdGet
     *     description: >
     *       Returns the log document for a bulk operation, including its status and, once it has
     *       been planned, the per-action count of changes applied so far. Used to poll the progress
     *       of an operation that was started through one of the bulk endpoints. The bulk operation
     *       can be considered finished when its status is "completed" or "failed".
     *     tags: [Bulk]
     *     x-since: 5.3.0
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The id of the bulk operation, as returned when it was started.
     *     responses:
     *       '200':
     *         description: The bulk operation log
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 _id:
     *                   type: string
     *                   description: The bulk operation id.
     *                 type:
     *                   type: string
     *                   enum: [delete-contact, move-contact]
     *                   description: The kind of operation that was requested.
     *                 params:
     *                   type: object
     *                   description: The parameters the operation was requested with.
     *                 status:
     *                   type: string
     *                   enum: [queued, running, completed, failed]
     *                   description: >
     *                     The state of the operation as a whole. It is finished when this is
     *                     "completed" or "failed".
     *                 error:
     *                   type: object
     *                   description: Why the operation failed, present only when it failed as a whole.
     *                   properties:
     *                     message:
     *                       type: string
     *                 start_date:
     *                   type: string
     *                   format: date-time
     *                   description: When the operation was started.
     *                 updated_date:
     *                   type: string
     *                   format: date-time
     *                   description: When the operation was last updated.
     *                 summary:
     *                   $ref: '#/components/schemas/BulkOperationSummary'
     *                 actions:
     *                   type: object
     *                   description: >
     *                     Per-action progress, keyed by action id. Absent until the operation has
     *                     been planned.
     *                   additionalProperties:
     *                     type: object
     *                     properties:
     *                       action:
     *                         type: string
     *                         enum: [delete, set-contact, set-parent, delete-user]
     *                       updated_date:
     *                         type: string
     *                         format: date-time
     *                       total_changes_count:
     *                         type: integer
     *                       failed_operations:
     *                         type: array
     *                         description: The operations that failed, present only when any did.
     *                         items:
     *                           type: object
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     */
    get: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true });
      const log = await service.getLog(req.params.id);
      if (!log) {
        return serverUtils.error({ status: 404, message: 'Bulk operation not found' }, req, res);
      }
      res.json(log);
    })
  }
};
