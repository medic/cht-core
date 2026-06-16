const { InvalidArgumentError } = require('@medic/cht-datasource');
const auth = require('../auth');
const serverUtils = require('../server-utils');
const errors = require('../errors');
const usersWithoutReplication = require('../services/replication/users-without-replication');

const parseMinFailures = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new InvalidArgumentError(`The min_failures must be a positive integer: [${JSON.stringify(value)}].`);
  }
  return parsed;
};

module.exports = {
  /**
   * @openapi
   * /api/v1/users-without-replication:
   *   get:
   *     summary: Get users that are failing to replicate
   *     operationId: v1UsersWithoutReplicationGet
   *     description: >
   *       Returns the users that appear unable to replicate: their replication limit log is older than a
   *       month (so no successful replication has happened since) and they have logged replication failures
   *       since that last log. The reported failure count is the number of failures accrued since each
   *       user's last successful replication. Only allowed for database admins.
   *     tags: [User]
   *     parameters:
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
   *                         description: Timestamp of the user's last replication limit log entry.
   *                       failures_since_last_replication:
   *                         type: number
   *                         description: Number of replication failures logged since that last entry.
   *       '400':
   *         description: Invalid query parameter.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
  get: async (req, res) => {
    try {
      const userCtx = await auth.getUserCtx(req);
      if (!auth.isDbAdmin(userCtx)) {
        throw new errors.AuthenticationError('User is not an admin');
      }

      const result = await usersWithoutReplication.get({
        minFailures: parseMinFailures(req.query.min_failures),
      });
      res.json(result);
    } catch (err) {
      serverUtils.error(err, req, res, true);
    }
  },
};
