const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { Report, Qualifier } = require('@medic/cht-datasource');
const auth = require('../auth');

const getReport = ctx.bind(Report.v1.get);
const getReportWithLineage = ctx.bind(Report.v1.getWithLineage);
const getReportIds = ctx.bind(Report.v1.getUuidsPage);
const create = ctx.bind(Report.v1.create);
const update = ctx.bind(Report.v1.update);

/**
 * @openapi
 * tags:
 *   - name: Report
 *     description: Operations for reports
 */
module.exports = {
  v1: {
    /**
     * @openapi
     * /api/v1/report/{id}:
     *   get:
     *     summary: Get a report by id
     *     operationId: v1ReportIdGet
     *     description: >
     *       Returns a report record. Optionally includes the full contact, patient, and/or place lineage.
     *     tags: [Report]
     *     x-since: 4.18.0
     *     x-permissions:
     *       hasAll: [can_view_reports]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The id of the report to retrieve
     *       - $ref: '#/components/parameters/withLineage'
     *     responses:
     *       '200':
     *         description: The report record
     *         content:
     *           application/json:
     *             schema:
     *               oneOf:
     *                 - $ref: '#/components/schemas/v1.Report'
     *                 - $ref: '#/components/schemas/v1.ReportWithLineage'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     */
    get: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_reports'] });
      const { params: { uuid }, query: { with_lineage } } = req;
      const getReportRecord = with_lineage === 'true' ? getReportWithLineage : getReport;
      const report = await getReportRecord(Qualifier.byUuid(uuid));
      if (!report) {
        return serverUtils.error({ status: 404, message: 'Report not found' }, req, res);
      }

      return res.json(report);
    }),

    /**
     * @openapi
     * /api/v1/report/uuid:
     *   get:
     *     summary: Get report UUIDs
     *     operationId: v1ReportUuidGet
     *     description: >
     *       Returns a paginated array of report identifiers matching the given freetext search term.
     *     tags: [Report]
     *     x-since: 4.18.0
     *     x-permissions:
     *       hasAll: [can_view_reports]
     *     parameters:
     *       - in: query
     *         name: freetext
     *         required: true
     *         schema:
     *           type: string
     *           minLength: 3
     *         description: >
     *           A search term for filtering reports. Must be at least 3 characters and not contain whitespace.
     *       - $ref: '#/components/parameters/cursor'
     *       - $ref: '#/components/parameters/limitId'
     *     responses:
     *       '200':
     *         description: A page of report UUIDs
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   description: The results for this page
     *                   items:
     *                     type: string
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
    getUuids: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_reports'] });
      const qualifier = Qualifier.byFreetext(req.query.freetext);
      const docs = await getReportIds(qualifier, req.query.cursor, req.query.limit);
      return res.json(docs);
    }),

    /**
     * @openapi
     * /api/v1/report:
     *   post:
     *     summary: Create a new report
     *     operationId: v1ReportPost
     *     description: Creates a new report.
     *     tags: [Report]
     *     x-since: 5.2.0
     *     x-permissions:
     *       hasAny: [can_create_records, can_edit]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/v1.ReportInput'
     *     responses:
     *       '200':
     *         description: The created report record
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/v1.Report'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    create: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_create_records', 'can_edit'] });
      const reportDoc = await create(req.body);
      return res.json(reportDoc);
    }),

    /**
     * @openapi
     * /api/v1/report/{id}:
     *   put:
     *     summary: Update a report
     *     operationId: v1ReportIdPut
     *     description: >
     *       Updates an existing report.  Fields omitted on the request will be removed from the record.
     *       Any included lineage data will be minified on the stored record.
     *     tags: [Report]
     *     x-since: 5.2.0
     *     x-permissions:
     *       hasAny: [can_update_reports, can_edit]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: The id of the report to update
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             oneOf:
     *               - $ref: '#/components/schemas/v1.Report'
     *               - $ref: '#/components/schemas/v1.ReportWithLineage'
     *             properties:
     *               contact:
     *                 oneOf:
     *                   - type: string
     *                     description: UUID of the contact
     *                   - $ref: '#/components/schemas/NormalizedParent'
     *     responses:
     *       '200':
     *         description: The updated report record
     *         content:
     *           application/json:
     *             schema:
     *               oneOf:
     *                 - $ref: '#/components/schemas/v1.Report'
     *                 - $ref: '#/components/schemas/v1.ReportWithLineage'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     *       '404':
     *         $ref: '#/components/responses/NotFound'
     */
    update: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAny: ['can_update_reports', 'can_edit'] });
      const { params: { uuid }, body } = req;
      const updateReportInput = {
        ...body,
        _id: uuid,
      };
      const updatedReportDoc = await update(updateReportInput);
      return res.json(updatedReportDoc);
    }),
  }
};
