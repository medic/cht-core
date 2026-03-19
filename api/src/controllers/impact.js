const service = require('../services/impact');
const serverUtils = require('../server-utils');
const auth = require('../auth');
const { PermissionError } = require('../errors');

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx)) {
    throw new PermissionError('Insufficient privileges');
  }
};

module.exports = {
  v1: {
    /**
     * @openapi
     * /api/v1/impact:
     *   get:
     *     summary: Get impact metrics
     *     operationId: v1ImpactGet
     *     description: Returns aggregated impact metrics including user, contact, and report counts.
     *     tags: [Monitoring]
     *     x-since: 5.0.0
     *     responses:
     *       '200':
     *         description: The impact metrics
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 users:
     *                   type: object
     *                   properties:
     *                     count:
     *                       type: number
     *                       description: Total number of users.
     *                 contacts:
     *                   type: object
     *                   properties:
     *                     count:
     *                       type: number
     *                       description: Total number of contacts.
     *                     by_type:
     *                       type: array
     *                       description: Contact counts broken down by contact type.
     *                       items:
     *                         type: object
     *                         properties:
     *                           type:
     *                             type: string
     *                             description: Name of the contact type.
     *                           count:
     *                             type: number
     *                             description: Total number of contacts with the type.
     *                 reports:
     *                   type: object
     *                   properties:
     *                     count:
     *                       type: number
     *                       description: Total number of reports.
     *                     by_form:
     *                       type: array
     *                       description: Report counts broken down by form.
     *                       items:
     *                         type: object
     *                         properties:
     *                           form:
     *                             type: string
     *                             description: Name of the form.
     *                           count:
     *                             type: number
     *                             description: Total number of reports with the form.
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    get: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);
      const impact = await service.jsonV1();
      res.json(impact);
    })
  }
};
