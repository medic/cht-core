const auth = require('../auth');
const serverUtils = require('../server-utils');
const replicationFailureLog = require('../services/replication/replication-failure-log');
const pagination = require('../services/pagination');
const errors = require('../errors');
const moment = require('moment');

module.exports = {
  /**
   * @openapi
   * /api/v1/replication-failure-logs:
   *   get:
   *     summary: Get replication failure logs
   *     operationId: v1ReplicationFailureLogsGet
   *     description: >
   *       Returns a paginated page of full replication failure log documents. Optionally filter by `user`
   *       and/or `reporting_period`. Use the `cursor` returned in each response to retrieve the next page;
   *       a `null` cursor indicates there are no more pages. Only allowed for database admins.
   *     tags: [User]
   *     parameters:
   *       - in: query
   *         name: user
   *         schema:
   *           type: string
   *         description: Filter logs to a specific username.
   *       - in: query
   *         name: reporting_period
   *         schema:
   *           type: string
   *         description: >
   *           Filter logs to a specific reporting period in YYYY-MM format. Defaults to the current month when
   *           no `user` filter is provided. When a `user` is provided, defaults to "all periods" for that user.
   *       - $ref: '#/components/parameters/cursor'
   *       - $ref: '#/components/parameters/limitEntity'
   *     responses:
   *       '200':
   *         description: A page of full failure log documents.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 cursor:
   *                   $ref: '#/components/schemas/PageCursor'
   *                 data:
   *                   type: array
   *                   description: One full failure log document per matching (user, reporting period) pair.
   *                   items:
   *                     type: object
   *                     properties:
   *                       _id:
   *                         type: string
   *                       _rev:
   *                         type: string
   *                       user:
   *                         type: string
   *                       date:
   *                         type: number
   *                       total_failures:
   *                         type: number
   *                       failures:
   *                         type: array
   *                         description: >
   *                           The most recent failures for the user (capped at 50). The total count is available
   *                           in `total_failures`.
   *                         items:
   *                           type: object
   *                           properties:
   *                             date:
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
   *                               oneOf:
   *                                 - type: number
   *                                 - type: string
   *                                   enum: [unknown]
   *                               description: >
   *                                 Number of subjects the user had access to at the time of the failure. The
   *                                 string `unknown` if the request failed before the authorization context
   *                                 was computed.
   *                             docs_count:
   *                               oneOf:
   *                                 - type: number
   *                                 - type: string
   *                                   enum: [unknown]
   *                               description: >
   *                                 Total number of docs the user has access to (before purge filtering). The
   *                                 string `unknown` if the request failed before the doc list was filtered.
   *                             unpurged_docs_count:
   *                               oneOf:
   *                                 - type: number
   *                                 - type: string
   *                                   enum: [unknown]
   *                               description: >
   *                                 Number of docs after purge filtering — i.e. what the client was about to
   *                                 receive. The string `unknown` if the request failed before the purge step.
   *                                 Reading these three counters together tells you how far the request
   *                                 progressed before failing.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
  get: async (req, res) => {
    try {
      const userCtx = await auth.getUserCtx(req);
      if (!auth.isDbAdmin(userCtx)) {
        throw new errors.AuthenticationError('User is not an admin');
      }

      let reportingPeriod = req.query.reporting_period;
      if (!reportingPeriod && !req.query.user) {
        reportingPeriod = moment().format('YYYY-MM');
      }

      const result = await replicationFailureLog.get({
        user: req.query.user,
        reportingPeriod,
        cursor: pagination.parseCursor(req.query.cursor),
        limit: pagination.parseLimit(req.query.limit),
      });
      res.json(result);
    } catch (err) {
      serverUtils.error(err, req, res, true);
    }
  },
};
