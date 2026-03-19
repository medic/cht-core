const auth = require('../auth');
const serverUtils = require('../server-utils');
const replicationLimitLog = require('../services/replication-limit-log');

module.exports = {
  /**
   * @openapi
   * /api/v1/users-doc-count:
   *   get:
   *     summary: Get user document replication counts
   *     operationId: v1UsersDocCountGet
   *     description: >
   *       Returns the quantity of documents replicated by each user. Optionally filter by username. Only allowed for
   *       database admins.
   *     tags: [User]
   *     x-since: 3.11.0
   *     parameters:
   *       - in: query
   *         name: user
   *         schema:
   *           type: string
   *         description: Filter by username. If not provided, returns all users.
   *     responses:
   *       '200':
   *         description: User replication document counts
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 limit:
   *                   type: number
   *                   description: The configured replication limit.
   *                 users:
   *                   description: >
   *                     A single user replication log object (when filtered) or an object
   *                     keyed by username.
   *                   type: object
   *                   properties:
   *                     _id:
   *                       type: string
   *                     _rev:
   *                       type: string
   *                     user:
   *                       type: string
   *                       description: The username.
   *                     date:
   *                       type: number
   *                       description: Timestamp of the replication count entry.
   *                     count:
   *                       type: number
   *                       description: Number of documents replicated by the user.
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   */
  get: (req, res) => {
    return auth
      .getUserCtx(req)
      .then((userCtx) => {
        if (!auth.isDbAdmin(userCtx)) {
          throw {
            code: 401,
            message: 'User is not an admin'
          };
        }

        return replicationLimitLog.get(req.query.user);
      })
      .then(logs => res.json(logs))
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  }
};
