const ctx = require('../services/data-context');
const serverUtils = require('../server-utils');
const { Report, Qualifier, InvalidArgumentError } = require('@medic/cht-datasource');
const auth = require('../auth');

const getReport = ctx.bind(Report.v1.get);
const getReportWithLineage = ctx.bind(Report.v1.getWithLineage);
const getReportIds = ctx.bind(Report.v1.getUuidsPage);
const getReportDocs = ctx.bind(Report.v1.getPage);
const getReportSummaries = ctx.bind(Report.v1.getSummaries);
const create = ctx.bind(Report.v1.create);
const update = ctx.bind(Report.v1.update);

const buildIdsQualifier = (ids) => {
  const idsArray = (Array.isArray(ids) ? ids : ids.split(',')).filter(Boolean);
  if (!idsArray.length) {
    throw new InvalidArgumentError(`Invalid ids [${JSON.stringify(ids)}].`);
  }
  return Qualifier.byIds(idsArray);
};

// Accepts `?form=a,b` and `?form=a&form=b` alike, matching how `ids` is handled above rather than
// picking one convention for this parameter alone.
const buildFormQualifier = (form) => {
  const formsArray = (Array.isArray(form) ? form : form.split(',')).filter(Boolean);
  if (!formsArray.length) {
    throw new InvalidArgumentError(`Invalid forms [${JSON.stringify(form)}].`);
  }
  return Qualifier.byForms(formsArray);
};

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
     *     x-since: 5.3.0
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
     *       Returns a paginated array of report identifiers matching either the given freetext search term or the
     *       given form codes. Exactly one of `freetext` and `form` is required; if both are given, `freetext` is
     *       used and `form` is ignored.
     *     tags: [Report]
     *     x-since: 4.18.0
     *     x-permissions:
     *       hasAll: [can_view_reports]
     *     parameters:
     *       - in: query
     *         name: freetext
     *         required: false
     *         schema:
     *           type: string
     *           minLength: 3
     *         description: >
     *           A search term for filtering reports. Must be at least 3 characters and not contain whitespace.
     *           Required unless `form` is given.
     *       - in: query
     *         name: form
     *         required: false
     *         x-since: 5.3.0
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of form codes (e.g. `pregnancy,delivery`), or the parameter repeated once
     *           per code. Each is matched verbatim against the report's `form` field. Required unless `freetext`
     *           is given.
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
      // Freetext wins when both are given, so a caller that already sends `freetext` keeps its
      // existing behaviour no matter what else is on the query string.
      const qualifier = req.query.freetext === undefined && req.query.form !== undefined
        ? buildFormQualifier(req.query.form)
        : Qualifier.byFreetext(req.query.freetext);
      const docs = await getReportIds(qualifier, req.query.cursor, req.query.limit);
      return res.json(docs);
    }),

    /**
     * @openapi
     * /api/v1/report/summary:
     *   post:
     *     summary: Get report summaries by id
     *     operationId: v1ReportSummaryPost
     *     description: >
     *       Returns compact summary records for the reports identified by the provided ids. Ids that do not
     *       identify an existing report are silently omitted from the result.
     *     tags: [Report]
     *     x-since: 5.3.0
     *     x-permissions:
     *       hasAll: [can_view_reports]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               ids:
     *                 type: array
     *                 items:
     *                   type: string
     *             required: [ids]
     *     responses:
     *       '200':
     *         description: An array of report summaries
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/v1.ReportSummary'
     *       '400':
     *         $ref: '#/components/responses/BadRequest'
     *       '401':
     *         $ref: '#/components/responses/Unauthorized'
     *       '403':
     *         $ref: '#/components/responses/Forbidden'
     */
    getSummaries: serverUtils.doOrError(async (req, res) => {
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_reports'] });
      const summaries = [];
      for await (const summary of getReportSummaries(Qualifier.byIds(req.body?.ids))) {
        summaries.push(summary);
      }
      return res.json(summaries);
    }),

    /**
     * @openapi
     * /api/v1/report:
     *   get:
     *     summary: Get reports
     *     operationId: v1ReportGet
     *     description: >
     *       Returns a paginated array of report records for the given ids. Use the `cursor` returned in each
     *       response to retrieve subsequent pages.
     *     tags: [Report]
     *     x-since: 5.3.0
     *     x-permissions:
     *       hasAll: [can_view_reports]
     *     parameters:
     *       - in: query
     *         name: ids
     *         required: true
     *         schema:
     *           type: string
     *         description: A comma-separated list of report ids to fetch.
     *       - $ref: '#/components/parameters/cursor'
     *       - $ref: '#/components/parameters/limitEntity'
     *     responses:
     *       '200':
     *         description: A page of report records
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   description: The results for this page
     *                   items:
     *                     $ref: '#/components/schemas/v1.Report'
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
      await auth.assertPermissions(req, { isOnline: true, hasAll: ['can_view_reports'] });
      if (!req.query.ids) {
        return serverUtils.error({ status: 400, message: 'Query param ids is required' }, req, res);
      }
      const qualifier = buildIdsQualifier(req.query.ids);
      const docs = await getReportDocs(qualifier, req.query.cursor, req.query.limit);
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
