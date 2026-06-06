const auth = require('../auth');
const { Target, Qualifier } = require('@medic/cht-datasource');
const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { PermissionError } = require('../errors');

const getTarget = ctx.bind(Target.v1.get);
const getTargets = ctx.bind(Target.v1.getPage);

const checkUserPermissions = async (req) => {
  const userCtx = await auth.getUserCtx(req);
  if (!auth.isOnlineOnly(userCtx)) {
    throw new PermissionError('Insufficient privileges');
  }
};

const getContactIdQualifier = ({ contact_ids, contact_id }) => {
  if (contact_id) {
    return Qualifier.byContactId(contact_id);
  }
  const contactIds = (contact_ids ?? '')
    .split(',')
    .filter(Boolean);
  return Qualifier.byContactIds(contactIds);
};

/**
 * @openapi
 * tags:
 *   - name: Target
 *     description: Operations for targets
 */
module.exports = {
  v1: {
    /**
     * @openapi
     * /api/v1/target/{id}:
     *   get:
     *     summary: Get a target by id
     *     operationId: v1TargetIdGet
     *     description: Returns a target record.
     *     tags: [Target]
     *     x-since: 5.1.0
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The id of the target to retrieve
     *     responses:
     *       '200':
     *         description: The target record
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/v1.Target'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     */
    get: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);
      const { id } = req.params;
      const target = await getTarget(Qualifier.byId(id));

      if (!target) {
        return serverUtils.error({ status: 404, message: 'Target not found' }, req, res);
      }

      return res.json(target);
    }),
    /**
     * @openapi
     * /api/v1/target:
     *   get:
     *     summary: Get targets
     *     operationId: v1TargetGet
     *     description: >
     *       Returns a paginated array of targets for the given contact and reporting period. Use the `cursor` returned
     *       in each response to retrieve subsequent pages. See also [Get Target by id](#/Target/v1TargetIdGet) for
     *       retrieving a single target.
     *     tags: [Target]
     *     x-since: 5.1.0
     *     parameters:
     *       - in: query
     *         name: contact_id
     *         schema:
     *           type: string
     *         description: >
     *           A single contact id to filter targets by. Either `contact_id` or `contact_ids` must be
     *           provided.
     *       - in: query
     *         name: contact_ids
     *         schema:
     *           type: string
     *         description: >
     *           Comma-separated contact ids to filter targets by. Either `contact_id` or `contact_ids` must
     *           be provided.
     *       - in: query
     *         name: reporting_period
     *         required: true
     *         schema:
     *           type: string
     *         description: "The reporting period to filter targets by (e.g. '2025-09')"
     *       - $ref: '#/components/parameters/cursor'
     *       - $ref: '#/components/parameters/limitEntity'
     *     responses:
     *       '200':
     *         description: A page of target records
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   description: The results for this page
     *                   items:
     *                     $ref: '#/components/schemas/v1.Target'
     *                 cursor:
     *                   $ref: '#/components/schemas/PageCursor'
     *               required: [data, cursor]
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    getAll: serverUtils.doOrError(async (req, res) => {
      await checkUserPermissions(req);

      const docs = await getTargets(
        Qualifier.and(
          getContactIdQualifier(req.query),
          Qualifier.byReportingPeriod(req.query.reporting_period)
        ),
        req.query.cursor,
        req.query.limit
      );

      return res.json(docs);
    }),
  },
};
