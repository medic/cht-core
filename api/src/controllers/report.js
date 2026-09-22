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
// picking one convention per parameter. `?subject=` is parsed the same way. `name` is only used in the
// error, and matches the message shape the by*() builders throw below for other invalid input, so every
// path that can reject a value gives a caller one consistent body to parse.
const parseListParam = (name, value) => {
  // `qs.parse` turns `?form[a]=b` into an object, which has nothing to split.
  if (!Array.isArray(value) && typeof value !== 'string') {
    throw new InvalidArgumentError(`Invalid ${name} [${JSON.stringify(value)}].`);
  }
  const values = (Array.isArray(value) ? value : value.split(',')).filter(Boolean);
  if (!values.length) {
    throw new InvalidArgumentError(`Invalid ${name} [${JSON.stringify(values)}].`);
  }
  return values;
};

const buildFormsQualifier = (form) => Qualifier.byForms(parseListParam('forms', form));

const buildSubjectsQualifier = (subject) => Qualifier.bySubjects(parseListParam('subjects', subject));

const buildUuidsQualifier = ({ freetext, form, subject }) => {
  // Freetext wins when more than one is given, then form, so a caller that already sends `freetext`
  // keeps its existing behavior no matter what else is on the query string.
  if (freetext !== undefined) {
    return Qualifier.byFreetext(freetext);
  }
  if (form !== undefined) {
    return buildFormsQualifier(form);
  }
  if (subject !== undefined) {
    return buildSubjectsQualifier(subject);
  }
  // None of them given: fall through to `byFreetext` so the missing-parameter error stays the one
  // this endpoint has always thrown.
  return Qualifier.byFreetext(freetext);
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
     *       Returns a paginated array of report identifiers matching the given freetext search term, form codes,
     *       or subject identifiers. Exactly one of `freetext`, `form` and `subject` is required; if more than one
     *       is given, `freetext` wins, then `form`, and the rest are ignored.
     *
     *
     *       Each identifier appears at most once on a page. A report is indexed once per subject field it sets,
     *       so one report can match several of the values given to `subject`; those repeats are collapsed within
     *       the page.
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
     *           Required unless `form` or `subject` is given.
     *       - in: query
     *         name: form
     *         required: false
     *         x-since: 5.3.0
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of form codes (e.g. `pregnancy,delivery`), or the parameter repeated once
     *           per code. Each is matched verbatim against the report's `form` field. Required unless `freetext`
     *           or `subject` is given.
     *       - in: query
     *         name: subject
     *         required: false
     *         x-since: 5.4.0
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of subject identifiers, or the parameter repeated once per identifier. A
     *           subject is identified either by a shortcode (`patient_id`, `place_id`, `case_id`) or by a UUID
     *           (`patient_uuid`, `place_uuid`), and both kinds can be mixed in one request. Each is matched
     *           verbatim. Required unless `freetext` or `form` is given.
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
      const qualifier = buildUuidsQualifier(req.query);
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
     *       Returns a paginated array of report records for the given ids, or of the reports about the given
     *       subjects. At least one of `ids` or `subject` must be provided; if both are given, `ids` is used and
     *       `subject` is ignored. Use the `cursor` returned in each response to retrieve subsequent pages.
     *
     *
     *       Each report appears at most once on a page. A report is indexed once per subject field it sets, so
     *       one report can match several of the values given to `subject`; those repeats are collapsed within
     *       the page.
     *     tags: [Report]
     *     x-since: 5.3.0
     *     x-permissions:
     *       hasAll: [can_view_reports]
     *     parameters:
     *       - in: query
     *         name: ids
     *         required: false
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of report ids to fetch. Required unless `subject` is given. Takes
     *           precedence over `subject` when both are provided.
     *       - in: query
     *         name: subject
     *         required: false
     *         x-since: 5.4.0
     *         schema:
     *           type: string
     *         description: >
     *           A comma-separated list of subject identifiers, or the parameter repeated once per identifier. A
     *           subject is identified either by a shortcode (`patient_id`, `place_id`, `case_id`) or by a UUID
     *           (`patient_uuid`, `place_uuid`), and both kinds can be mixed in one request. Each is matched
     *           verbatim. Required unless `ids` is given.
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
      if (!req.query.ids && !req.query.subject) {
        return serverUtils.error(
          { status: 400, message: 'Either query param ids or subject is required' }, req, res
        );
      }
      // Ids win when both are given, so a caller that already sends `ids` keeps its existing behavior
      // no matter what else is on the query string.
      const qualifier = req.query.ids
        ? buildIdsQualifier(req.query.ids)
        : buildSubjectsQualifier(req.query.subject);
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
