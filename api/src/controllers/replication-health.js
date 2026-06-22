const { InvalidArgumentError } = require('@medic/cht-datasource');
const auth = require('../auth');
const serverUtils = require('../server-utils');
const errors = require('../errors');
const replicationHealth = require('../services/replication/replication-health');

const assertAdmin = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isDbAdmin(userCtx)) {
    throw new errors.AuthenticationError('User is not an admin');
  }
};

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
   *       Returns the users that appear unable to replicate: their last successful replication is older
   *       than `days` days ago and they have logged replication failures since that last replication. The
   *       reported failure count is the number of failures accrued since each user's last successful
   *       replication. Only allowed for database admins.
   *     tags: [User]
   *     parameters:
   *       - in: query
   *         name: days
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 7
   *         description: >
   *           Staleness window in days. Users whose last successful replication is older than this many
   *           days are considered. Defaults to 7.
   *       - in: query
   *         name: min_failures
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: >
   *           Minimum number of failures since the last successful replication for a user to be listed.
   *           Defaults to 1, so any user with at least one failure is reported.
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
   *                         type: number
   *                         description: Timestamp of the user's last successful replication.
   *                       failures_since_last_replication:
   *                         type: number
   *                         description: Number of replication failures logged since that last replication.
   *       '400':
   *         description: Invalid query parameter.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
  failed: async (req, res) => {
    try {
      await assertAdmin(req);

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
