const moment = require('moment');
const logger = require('../logger');

const auth = require('../auth');
const serverUtils = require('../server-utils');

const service = require('../services/export-data');

const formats = {
  xml: {
    extension: 'xml',
    contentType: 'application/vnd.ms-excel'
  },
  csv: {
    extension: 'csv',
    contentType: 'text/csv'
  },
  json: {
    extension: 'json',
    contentType: 'application/json'
  }
};

const writeExportHeaders = (res, type, format) => {
  const filename = `${type}-${moment().format('YYYYMMDDHHmm')}.${format.extension}`;
  res
    .set('Content-Type', format.contentType)
    .set('Content-Disposition', 'attachment; filename=' + filename);
};

const getExportPermission = type => {
  if (type === 'feedback') {
    return 'can_export_feedback';
  }
  if (type === 'contacts') {
    return 'can_export_contacts';
  }
  return 'can_export_messages';
};

module.exports = {
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
      if (filters.verified) {
        filters.verified = (filters.verified === 'true');
      }
      if (filters.valid) {
        filters.valid = (filters.valid === 'true');
      }
    };

    const correctOptionsTypes = options => {
      if (options.humanReadable) {
        options.humanReadable = (options.humanReadable === 'true');
      } else {
        options.humanReadable = false;
      }
    };

    const type = req.params.type,
          filters = (req.body && req.body.filters) ||
                    (req.query && req.query.filters) || {},
          options = (req.body && req.body.options) ||
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
    logger.info(`  params: ${JSON.stringify(filters, null, 2)}`);
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
      })
      .then(() => auth.check(req, getExportPermission(req.params.type)))
      .then(() => {
        writeExportHeaders(res, req.params.type, formats.csv);

        // To respond as quickly to the request as possible
        res.flushHeaders();

        service
          .export(type, filters, options)
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
