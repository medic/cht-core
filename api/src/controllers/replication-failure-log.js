const auth = require('../auth');
const serverUtils = require('../server-utils');
const moment = require('moment');
const replicationFailureLog = require('../services/replication/replication-failure-log');

module.exports = {
  /**
   * @openapi
   * /api/v1/replication-failure-logs:
   *   get:
   *     summary: Get replication failure logs for a given month
   *     operationId: v1ReplicationFailureLogsGet
   *     description: >
   *       Returns the replication failure logs for all users for the specified month. Defaults to the current
   *       month if no month is provided. Only allowed for database admins.
   *     tags: [User]
   *     parameters:
   *       - in: query
   *         name: month
   *         schema:
   *           type: string
   *         description: Month to query in YYYY-MM format. If not provided, defaults to the current month.
   *     responses:
   *       '200':
   *         description: Replication failure logs for the requested month
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 month:
   *                   type: string
   *                   description: The month the logs were queried for, in YYYY-MM format.
   *                 logs:
   *                   type: array
   *                   description: One log document per user that had at least one failure in the month.
   *                   items:
   *                     type: object
   *                     properties:
   *                       _id:
   *                         type: string
   *                       _rev:
   *                         type: string
   *                       type:
   *                         type: string
   *                         description: Always 'replication-fail'.
   *                       user:
   *                         type: string
   *                         description: The username.
   *                       timestamp:
   *                         type: number
   *                         description: Timestamp of when the log document was created.
   *                       total_failures:
   *                         type: number
   *                         description: Total number of failures recorded for the user in the month.
   *                       failures:
   *                         type: array
   *                         description: >
   *                           The most recent failures for the user (capped at 50). The total count is available
   *                           in `total_failures`.
   *                         items:
   *                           type: object
   *                           properties:
   *                             timestamp:
   *                               type: number
   *                             status_code:
   *                               type: number
   *                               description: Response status code. 0 if the client cancelled the request.
   *                             duration:
   *                               type: number
   *                               description: Request duration in milliseconds.
   *                             request_id:
   *                               type: string
   *                             roles:
   *                               type: array
   *                               items:
   *                                 type: string
   *                             subjects_count:
   *                               type: number
   *                               description: Number of subjects the user had access to at the time of the failure.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
  get: async (req, res) => {
    try {
      const userCtx = await auth.getUserCtx(req);
      if (!auth.isDbAdmin(userCtx)) {
        throw { code: 401, message: 'User is not an admin' };
      }

      const month = req.query.month || moment().format('YYYY-MM');
      const logs = await replicationFailureLog.getByMonth(month);
      res.json({ month, logs });
    } catch (err) {
      serverUtils.error(err, req, res, true);
    }
  }
};
