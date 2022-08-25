const moment = require('moment');
const logger = require('../logger');

const auth = require('../auth');
const serverUtils = require('../server-utils');

const service = require('../services/export-data');

const writeExportHeaders = (res, type, format) => {
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
