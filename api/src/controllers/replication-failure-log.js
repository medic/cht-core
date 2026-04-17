const auth = require('../auth');
const serverUtils = require('../server-utils');
const moment = require('moment');
const replicationFailureLog = require('../services/replication/replication-failure-log');
const errors = require('../errors');

module.exports = {
  /**
   * @openapi
   * /api/v1/replication-failure-logs:
   *   get:
   *     summary: Get replication failure logs
   *     operationId: v1ReplicationFailureLogsGet
   *     description: >
   *       Returns replication failure logs. Behavior depends on the query params:
   *       - No `user` param: returns a lightweight summary (without the detailed `failures` array) for all users
   *         in the specified month. Defaults to the current month if no `month` is provided.
   *       - `user` param only: returns all full failure log documents for that user, across all months.
   *       - `user` and `month` params: returns the full failure log document for that user in that month.
   *
   *       Only allowed for database admins.
   *     tags: [User]
   *     parameters:
   *       - in: query
   *         name: month
   *         schema:
   *           type: string
   *         description: >
   *           Month to query in YYYY-MM format. When no `user` is provided, defaults to the current month.
   *           When combined with `user`, scopes the result to that month only.
   *       - in: query
   *         name: user
   *         schema:
   *           type: string
   *         description: >
   *           If provided, returns full failure log documents for this user. Combined with `month`, returns just
   *           the single month's document. Without `month`, returns all monthly documents for the user.
   *     responses:
   *       '200':
   *         description: Replication failure log summaries or full documents, depending on params.
   *         content:
   *           application/json:
   *             schema:
   *               oneOf:
   *                 - type: object
   *                   description: Summary response returned when no `user` query param is provided.
   *                   properties:
   *                     month:
   *                       type: string
   *                       description: The month the logs were queried for, in YYYY-MM format.
   *                     logs:
   *                       type: array
   *                       description: One summary per user that had at least one failure in the month.
   *                       items:
   *                         type: object
   *                         properties:
   *                           _id:
   *                             type: string
   *                           user:
   *                             type: string
   *                             description: The username.
   *                           total_failures:
   *                             type: number
   *                             description: >
   *                               Total number of failures recorded for the user in the month, derived from the
   *                               doc revision count (the log doc is only written on failure captures).
   *                 - type: object
   *                   description: Full log document returned when both `user` and `month` are provided.
   *                   properties:
   *                     month:
   *                       type: string
   *                     user:
   *                       type: string
   *                     log:
   *                       nullable: true
   *                       type: object
   *                       description: The full failure log document, or null if no failures were recorded.
   *                       properties:
   *                         _id:
   *                           type: string
   *                         _rev:
   *                           type: string
   *                         type:
   *                           type: string
   *                           description: Always 'replication-fail'.
   *                         user:
   *                           type: string
   *                         timestamp:
   *                           type: number
   *                         total_failures:
   *                           type: number
   *                         failures:
   *                           type: array
   *                           description: >
   *                             The most recent failures for the user (capped at 50). The total count is available
   *                             in `total_failures`.
   *                           items:
   *                             type: object
   *                             properties:
   *                               timestamp:
   *                                 type: number
   *                               status_code:
   *                                 type: number
   *                                 description: Response status code. 0 if the client cancelled the request.
   *                               duration:
   *                                 type: number
   *                                 description: Request duration in milliseconds.
   *                               request_id:
   *                                 type: string
   *                               roles:
   *                                 type: array
   *                                 items:
   *                                   type: string
   *                               subjects_count:
   *                                 type: number
   *                                 description: Number of subjects the user had access to at the time of the failure.
   *                 - type: object
   *                   description: All monthly log documents for a user when only `user` is provided.
   *                   properties:
   *                     user:
   *                       type: string
   *                     logs:
   *                       type: array
   *                       description: One full log document per month the user had failures in.
   *                       items:
   *                         type: object
   *                         description: See the single-month log schema above.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
  get: async (req, res) => {
    try {
      const userCtx = await auth.getUserCtx(req);
      if (!auth.isDbAdmin(userCtx)) {
        throw new errors.AuthenticationError('User is not an admin');
      }

      if (req.query.user) {
        if (req.query.month) {
          const log = await replicationFailureLog.getForUserAndMonth(req.query.month, req.query.user);
          return res.json({ month: req.query.month, user: req.query.user, log });
        }
        const logs = await replicationFailureLog.getAllForUser(req.query.user);
        return res.json({ user: req.query.user, logs });
      }

      const month = req.query.month || moment().format('YYYY-MM');
      const logs = await replicationFailureLog.getSummariesByMonth(month);
      res.json({ month, logs });
    } catch (err) {
      serverUtils.error(err, req, res, true);
    }
  }
};
