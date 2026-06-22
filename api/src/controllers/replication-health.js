const { InvalidArgumentError } = require('@medic/cht-datasource');
const auth = require('../auth');
const serverUtils = require('../server-utils');
const replicationHealth = require('../services/replication/replication-health');

const parsePositiveInteger = (value, name) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new InvalidArgumentError(`The ${name} must be a positive integer: [${JSON.stringify(value)}].`);
  }
  return parsed;
};

module.exports = {
  /**
   * @openapi
   * /api/v1/replication-health/failed:
   *   get:
   *     summary: Get users that are failing to replicate
   *     operationId: v1ReplicationHealthFailedGet
   *     description: >
   *       Returns the users that appear unable to replicate within the window: their last successful
   *       replication is older than `days` days ago AND they have logged at least `min_failures` failures
   *       within the window. Users whose only failures predate the window are not listed.
   *       Only allowed for database admins.
   *     tags: [User]
   *     parameters:
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 30
   *         description: >
   *           Staleness window in days. Users whose last successful replication is older than this many
   *           days are considered, and only failures within this window count toward `min_failures`.
   *           Defaults to 30.
   *       - in: query
   *         name: min_failures
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: >
   *           Minimum number of failures within the window for a user to be listed.
   *           Defaults to 1, so any user with at least one failure in the window is reported.
   *     responses:
   *       '200':
   *         description: The users that are failing to replicate.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 users:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       user:
   *                         type: string
   *                         description: The username.
   *                       last_replication_date:
   *                         type: [number, "null"]
   *                         description: >
   *                           Timestamp of the user's last successful replication. `null` if the user has
   *                           never successfully replicated.
   *                       failures_since_last_replication:
   *                         type: [number, "null"]
   *                         description: >
   *                           Number of replication failures logged since the user's last successful
   *                           replication. `null` if the user has never successfully replicated.
   *                       failures_in_window:
   *                         type: number
   *                         description: >
   *                           Number of replication failures logged within the `days` window (from the
   *                           cutoff onward). This is what `min_failures` is applied to.
   *       '400':
   *         description: Invalid query parameter.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
  failed: async (req, res) => {
    try {
      await auth.assertDbAdmin(req);

      const result = await replicationHealth.getFailed({
        days: parsePositiveInteger(req.query.days, 'days'),
        minFailures: parsePositiveInteger(req.query.min_failures, 'min_failures'),
      });
      res.json(result);
    } catch (err) {
      serverUtils.error(err, req, res, true);
    }
  },
};
