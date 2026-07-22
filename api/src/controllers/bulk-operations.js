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
     *       Returns the log document for a bulk operation, including the per-action status and the
     *       count of changes applied so far. Used to poll the progress of an operation that was
     *       started through one of the bulk endpoints. The bulk operation can be considered finished
     *       when all of its actions have a status of "completed" or "failed".
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
     *                 start_date:
     *                   type: string
     *                   format: date-time
     *                   description: When the operation was started.
     *                 actions:
     *                   type: object
     *                   description: Per-action status, keyed by action id.
     *                   additionalProperties:
     *                     type: object
     *                     properties:
     *                       status:
     *                         type: string
     *                         enum: [queued, completed, failed]
     *                       action:
     *                         type: string
     *                         enum: [archive, set-contact, delete-user]
     *                       updated_date:
     *                         type: string
     *                         format: date-time
     *                       total_changes_count:
     *                         type: integer
     *                       failed_operations:
     *                         type: array
     *                         description: The operations that failed, present only when status is failed.
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
