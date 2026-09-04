const moment = require('moment');
const logger = require('@medic/logger');

const auth = require('../auth');
const serverUtils = require('../server-utils');

const service = require('../services/export-data');

const writeExportHeaders = (res, type, format) => {
  const formats = {
    csv: {
      extension: 'csv',
      contentType: 'text/csv'
    },
    json: {
      extension: 'json',
      contentType: 'application/json'
    }
  };

  const formatData = formats[format];
  const filename = `${type}-${moment().format('YYYYMMDDHHmm')}.${formatData.extension}`;
  res
    .set('Content-Type', formatData.contentType)
    .set('Content-Disposition', 'attachment; filename=' + filename);
};

const getVerifiedValue = (value) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
};

/**
 * @openapi
 * tags:
 *   - name: Export
 *     description: Export data in various formats
 * components:
 *   schemas:
 *     ExportOptions:
 *       type: object
 *       properties:
 *         humanReadable:
 *           type: boolean
 *           description: Set to true to format dates as ISO 8601 instead of epoch timestamps.
 *       additionalProperties: true
 *     UserDevice:
 *       type: object
 *       properties:
 *         user:
 *           type: string
 *           description: The user's name.
 *         deviceId:
 *           type: string
 *           description: The unique key for the user's device.
 *         date:
 *           type: string
 *           description: >
 *             The date the telemetry entry was taken (YYYY-MM-DD), see
 *             [relevant docs](/technical-overview/data/performance/telemetry/).
 *         browser:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: The name of the browser used.
 *             version:
 *               type: string
 *               description: The version of the browser used.
 *         apk:
 *           type: string
 *           description: >
 *             The [version code](https://developer.android.com/reference/android/R.styleable#AndroidManifest_versionCode)
 *             of the Android app.
 *         android:
 *           type: string
 *           description: The version of Android OS.
 *         cht:
 *           type: string
 *           description: The version of CHT at time of telemetry.
 *         settings:
 *           type: string
 *           description: The revision of the App Settings document.
 *         storageFree:
 *           type: number
 *           description: Free storage space on the device in bytes. Added in CHT 5.0.0.
 *         storageTotal:
 *           type: number
 *           description: Total storage capacity of the device in bytes. Added in CHT 5.0.0.
 *   parameters:
 *     exportOptionsQuery:
 *       in: query
 *       name: options
 *       description: Export options.
 *       style: deepObject
 *       explode: true
 *       schema:
 *         type: object
 *         properties:
 *           humanReadable:
 *             enum: ['true', 'false']
 *             default: 'false'
 *             description: Set to "true" to format dates as ISO 8601 instead of epoch timestamps.
 *   responses:
 *     CsvExport:
 *       description: The exported data as a CSV file download
 *       content:
 *         text/csv:
 *           schema:
 *             type: string
 *             format: binary
 *     UserDeviceExport:
 *       description: User device information
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/UserDevice'
 */
module.exports = {
  /**
   * @openapi
   * /api/v2/export/dhis:
   *   get:
   *     summary: Export DHIS2 target data
   *     operationId: v2ExportDhisGet
   *     description: >
   *       Exports target data formatted as a DHIS2 dataValueSet. The data can be filtered to a specific section
   *       of the contact hierarchy or for a given time interval.
   *     tags: [Export]
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_dhis]
   *     parameters:
   *       - in: query
   *         name: filters
   *         schema:
   *           type: object
   *           properties:
   *             dataSet:
   *               type: string
   *               description: >
   *                 A DHIS2 dataSet ID. Targets associated with this dataSet will have their data aggregated.
   *             date:
   *               type: object
   *               required: [from]
   *               properties:
   *                 from:
   *                   type: number
   *                   description: Filter the target data to be within the month of this timestamp.
   *             orgUnit:
   *               type: string
   *               description: >
   *                 Filter the target data to only that associated with contacts with attribute
   *                 `{ dhis: { orgUnit } }`.
   *           required: [dataSet, date]
   *         style: deepObject
   *         explode: true
   *         description: Filters for the DHIS2 export.
   *       - $ref: '#/components/parameters/exportOptionsQuery'
   *     responses:
   *       '200':
   *         description: DHIS2 dataValueSet
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties: true
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *   post:
   *     summary: Export DHIS2 target data
   *     operationId: v2ExportDhisPost
   *     deprecated: true
   *     description: >
   *       Use [GET /api/v2/export/dhis](#/Export/v2ExportDhisGet) instead.
   *       Exports target data formatted as a DHIS2 dataValueSet. Accepts filters in the request body.
   *     tags: [Export]
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_dhis]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               filters:
   *                 type: object
   *                 properties:
   *                   dataSet:
   *                     type: string
   *                     description: A DHIS2 dataSet ID.
   *                   date:
   *                     type: object
   *                     required: [from]
   *                     properties:
   *                       from:
   *                         type: number
   *                         description: Filter target data to be within the month of this timestamp.
   *                   orgUnit:
   *                     type: string
   *                     description: Filter by contacts with this DHIS2 orgUnit attribute.
   *                 required: [dataSet, date]
   *               options:
   *                 $ref: '#/components/schemas/ExportOptions'
   *     responses:
   *       '200':
   *         description: DHIS2 dataValueSet
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties: true
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   * /api/v2/export/reports:
   *   get:
   *     summary: Export reports
   *     operationId: v2ExportReportsGet
   *     description: >
   *       Exports reports as CSV. Uses the
   *       [search library](https://github.com/medic/cht-core/tree/master/shared-libs/search) to ensure identical
   *       results to the front-end. Filters can be passed as query parameters using form-style encoding
   *       (e.g. `filters[forms][selected][0][code]=immunization_visit`).
   *     tags: [Export]
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_messages]
   *     parameters:
   *       - in: query
   *         name: filters
   *         schema:
   *           type: object
   *           properties:
   *             search:
   *               type: string
   *               description: A freetext search term.
   *             forms:
   *               type: object
   *               description: Filter by form codes.
   *               properties:
   *                 selected:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       code:
   *                         type: string
   *             date:
   *               type: object
   *               properties:
   *                 from:
   *                   type: number
   *                   description: Start of date range (epoch timestamp).
   *                 to:
   *                   type: number
   *                   description: End of date range (epoch timestamp).
   *             verified:
   *               type: string
   *               description: Filter by verification status ("true", "false").
   *             valid:
   *               type: string
   *               description: Filter by validity ("true").
   *           additionalProperties: true
   *         style: deepObject
   *         explode: true
   *         description: Filters for the reports export.
   *       - $ref: '#/components/parameters/exportOptionsQuery'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/CsvExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *   post:
   *     summary: Export reports
   *     operationId: v2ExportReportsPost
   *     deprecated: true
   *     description: >
   *       Use [GET /api/v2/export/reports](#/Export/v2ExportReportsGet) instead.
   *       Exports reports as CSV. Accepts filters in the request body.
   *     tags: [Export]
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_messages]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               filters:
   *                 type: object
   *                 properties:
   *                   search:
   *                     type: string
   *                     description: A freetext search term.
   *                   forms:
   *                     type: object
   *                     description: Filter by form codes.
   *                     properties:
   *                       selected:
   *                         type: array
   *                         items:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                   date:
   *                     type: object
   *                     properties:
   *                       from:
   *                         type: number
   *                         description: Start of date range (epoch timestamp).
   *                       to:
   *                         type: number
   *                         description: End of date range (epoch timestamp).
   *                   verified:
   *                     description: Filter by verification status.
   *                     oneOf:
   *                       - type: boolean
   *                       - type: array
   *                         items:
   *                           type: boolean
   *                   valid:
   *                     type: boolean
   *                     description: Filter by validity.
   *                 additionalProperties: true
   *               options:
   *                 $ref: '#/components/schemas/ExportOptions'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/CsvExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   * /api/v2/export/messages:
   *   get:
   *     summary: Export messages
   *     operationId: v2ExportMessagesGet
   *     description: |
   *       Exports messages as CSV.
   *       
   *       ### Response Columns
   *
   *       | Column             | Description                                                                          |
   *       | ------------------ | ------------------------------------------------------------------------------------ |
   *       | Record UUID        | The unique ID for the message in the database.                                       |
   *       | Patient ID         | The generated short patient ID for use in SMS.                                       |
   *       | Reported Date      | The date the message was received or generated.                                      |
   *       | From               | This phone number the message is or will be sent from.                               |
   *       | Contact Name       | The name of the user this message is assigned to.                                    |
   *       | Message Type       | The type of the message                                                              |
   *       | Message State      | The state of the message at the time this export was generated                       |
   *       | Received Timestamp | The datetime the message was received. Only applies to incoming messages.            |
   *       | Other Timestamps   | The datetime the message transitioned to each state.                                 |
   *       | Sent By            | The phone number the message was sent from. Only applies to incoming messages.       |
   *       | To Phone           | The phone number the message is or will be sent to. Only applies to outgoing.        |
   *       | Message Body       | The content of the message.                                                          |
   *       
   *     tags: [Export]
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_messages]
   *     parameters:
   *       - in: query
   *         name: filters
   *         schema:
   *           type: object
   *           properties:
   *             date:
   *               type: object
   *               properties:
   *                 from:
   *                   type: number
   *                   description: Start of date range (epoch timestamp).
   *                 to:
   *                   type: number
   *                   description: End of date range (epoch timestamp).
   *           additionalProperties: true
   *         style: deepObject
   *         explode: true
   *         description: Filters for the messages export.
   *       - $ref: '#/components/parameters/exportOptionsQuery'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/CsvExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *   post:
   *     summary: Export messages
   *     operationId: v2ExportMessagesPost
   *     deprecated: true
   *     description: >
   *       Use [GET /api/v2/export/messages](#/Export/v2ExportMessagesGet) instead.
   *       Exports messages as CSV. Accepts filters in the request body. See
   *       [GET](#/Export/v2ExportMessagesGet) for output column details.
   *     tags: [Export]
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_messages]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               filters:
   *                 type: object
   *                 properties:
   *                   date:
   *                     type: object
   *                     properties:
   *                       from:
   *                         type: number
   *                         description: Start of date range (epoch timestamp).
   *                       to:
   *                         type: number
   *                         description: End of date range (epoch timestamp).
   *                 additionalProperties: true
   *               options:
   *                 $ref: '#/components/schemas/ExportOptions'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/CsvExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   * /api/v2/export/contacts:
   *   get:
   *     summary: Export contacts
   *     operationId: v2ExportContactsGet
   *     description: |
   *       Exports contacts as a CSV. Filters use the same query format as the
   *       [search library](https://github.com/medic/cht-core/tree/master/shared-libs/search).
   *
   *       ### Response Columns
   *
   *       | Column       | Description                                                                    |
   *       | -------------| -------------------------------------------------------------------------------|
   *       | id           | The unique ID for the contact in the database.                                 |
   *       | rev          | The current CouchDb revision of contact in the database.                       |
   *       | name         | The name of the user this message is assigned to.                              |
   *       | patient_id   | The generated short patient ID for use in SMS.                                 |
   *       | type         | The contact type. For configurable hierarchies, this will always be `contact`. |
   *       | contact_type | The configurable contact type. Will be empty if using the default hierarchy.   |
   *       | place_id     | The generated short place ID for use in SMS.                                   |
   *     tags: [Export]
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_contacts]
   *     parameters:
   *       - in: query
   *         name: filters
   *         schema:
   *           type: object
   *           properties:
   *             search:
   *               type: string
   *               description: A freetext search term. (e.g. `GET /api/v2/export/contacts?filters[search]=jim`)
   *           additionalProperties: true
   *         style: deepObject
   *         explode: true
   *         description: Filters for the contacts export.
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/CsvExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *   post:
   *     summary: Export contacts
   *     operationId: v2ExportContactsPost
   *     deprecated: true
   *     description: >
   *       Use [GET /api/v2/export/contacts](#/Export/v2ExportContactsGet) instead.
   *       Exports contacts as a CSV. Accepts filters in the request body. See [GET](#/Export/v2ExportContactsGet) for
   *       output column details.
   *     tags: [Export]
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_contacts]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               filters:
   *                 type: object
   *                 properties:
   *                   search:
   *                     type: string
   *                     description: A freetext search term.
   *                 additionalProperties: true
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/CsvExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   * /api/v2/export/feedback:
   *   get:
   *     summary: Export feedback
   *     operationId: v2ExportFeedbackGet
   *     description: Exports user feedback data as CSV.
   *     tags: [Export]
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_feedback]
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/CsvExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *   post:
   *     summary: Export feedback
   *     operationId: v2ExportFeedbackPost
   *     deprecated: true
   *     description: >
   *       Use [GET /api/v2/export/feedback](#/Export/v2ExportFeedbackGet) instead.
   *       Exports user feedback data as CSV.
   *     tags: [Export]
   *     x-permissions:
   *       isOnline: true
   *       hasAny: [can_export_all, can_export_feedback]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             additionalProperties: true
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/CsvExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   * /api/v2/export/user-devices:
   *   get:
   *     summary: Export user device information
   *     operationId: v2ExportUserDevicesGet
   *     description: |
   *       This endpoint is deprecated as it can negatively impact server performance. Deployments should avoid using
   *       this endpoint or use it only when end users will not be impacted. An improved endpoint is
   *       [being planned](https://github.com/medic/cht-core/issues/10298) for a later date.
   *
   *       Returns a JSON array of CHT-related software versions and device information for each user device.
   *       This information is derived from the latest telemetry entry for each user device.
   *
   *       If a particular user has used multiple devices, an entry will be included for each device. Reference the
   *       date value to determine which devices have been recently used. If multiple users used the same physical
   *       device (e.g. they were logged into the same phone at different times), an entry will be included for each
   *       user.
   *     tags: [Export]
   *     deprecated: true
   *     x-since: 4.7.0
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_devices_details]
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/UserDeviceExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   *   post:
   *     summary: Export user device information
   *     operationId: v2ExportUserDevicesPost
   *     deprecated: true
   *     description: >
   *       Use [GET /api/v2/export/user-devices](#/Export/v2ExportUserDevicesGet) instead.
   *       Returns a JSON array of CHT-related software versions and device information for each user device.
   *       This endpoint may negatively impact server performance.
   *     tags: [Export]
   *     x-since: 4.7.0
   *     x-permissions:
   *       hasAny: [can_export_all, can_export_devices_details]
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/UserDeviceExport'
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  get: (req, res) => {
    /**
     * Integer values get parsed in by express as strings. This will not do!
     */
    const correctFilterTypes = filters => {
      if (filters.date && filters.date.from) {
        filters.date.from = parseInt(filters.date.from);
      }
      if (filters.date && filters.date.to) {
        filters.date.to = parseInt(filters.date.to);
      }
      if (Object.prototype.hasOwnProperty.call(filters, 'verified')) { // can be equal to empty string
        filters.verified = Array.isArray(filters.verified) ?
          filters.verified.map(getVerifiedValue) :
          [ getVerifiedValue(filters.verified) ];
      }
      if (filters.valid) {
        filters.valid = (filters.valid === 'true');
      }
    };

    const correctOptionsTypes = options => {
      options.humanReadable = (options.humanReadable === 'true');
    };

    const type = req.params.type;
    const filters = (req.body && req.body.filters) ||
                    (req.query && req.query.filters) || {};
    const options = (req.body && req.body.options) ||
                    (req.query && req.query.options) || {};

    correctFilterTypes(filters);
    correctOptionsTypes(options);

    if (!service.isSupported(type)) {
      return serverUtils.error({
        message: `Invalid export type "${type}"`,
        code: 404
      }, req, res);
    }

    logger.info(`Export requested for "${type}"`);
    logger.info(`  filters: ${JSON.stringify(filters, null, 2)}`);
    logger.info(`  options: ${JSON.stringify(options, null, 2)}`);

    // We currently only support online users (CouchDB admins and National Admins)
    // If we want to support offline users we should either:
    //  - Forcibly scope their search object to their facility, which is returned
    //    by the following auth check in ctx.district (maybe?)
    //  - Still don't let offline users use this API, and instead refactor the
    //    export logic so it can be used in webapp, and have exports works offline
    return auth.getUserCtx(req)
      .then(userCtx => {
        if (!auth.isOnlineOnly(userCtx)) {
          throw { code: 403, message: 'Insufficient privileges' };
        }
        return userCtx;
      })
      .then((userCtx) => {
        if (!auth.hasAllPermissions(userCtx, 'can_export_all')) {
          return auth.check(req, service.permission(type));
        }
      })
      .then(() => {
        const format = service.format(type);
        writeExportHeaders(res, type, format);

        const writeAsStream = format === 'csv';
        if (!writeAsStream) {
          return service.exportObject(type, filters, options)
            .then(obj => res.json(obj));
        }


        // To respond as quickly to the request as possible
        res.flushHeaders();

        service
          .exportStream(type, filters, options)
          .on('error', err => {
            // Because we've already flushed the headers above we can't use
            // serverUtils anymore, we just have to close the connection
            logger.error(`Error exporting data for "${type}"`);
            logger.info(`  params: ${JSON.stringify(filters, null, 2)}`);
            logger.info(`  options: ${JSON.stringify(options, null, 2)}`);
            logger.error('%o', err);
            res.end(`--ERROR--\nError exporting data: ${err.message}\n`);
          })
          .pipe(res);
      })
      .catch(err => serverUtils.error(err, req, res));
  }
};
