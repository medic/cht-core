const _ = require('underscore'),
      domain = require('domain'),
      moment = require('moment');

const auth = require('../auth'),
      serverUtils = require('../server-utils');

const exportDataV1 = require('../services/export-data'),
      exportDataV2 = require('../services/export-data-2');

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
  },
  zip: {
    extension: 'zip',
    contentType: 'application/zip'
  }
};

const writeExportHeaders = (res, type, format) => {
  const filename = `${type}-${moment().format('YYYYMMDDHHmm')}.${format.extension}`;
  res
    .set('Content-Type', format.contentType)
    .set('Content-Disposition', 'attachment; filename=' + filename);
};

const getExportPermission = function(type) {
  if (type === 'audit') {
    return 'can_export_audit';
  }
  if (type === 'feedback') {
    return 'can_export_feedback';
  }
  if (type === 'contacts') {
    return 'can_export_contacts';
  }
  if (type === 'logs') {
    return 'can_export_server_logs';
  }
  return 'can_export_messages';
};

module.exports = {
  routeV1: (req, res) => {
    auth.check(req, getExportPermission(req.params.type), req.query.district, function(err, ctx) {
      if (err) {
        return serverUtils.error(err, req, res, true);
      }
      req.query.type = req.params.type;
      req.query.form = req.params.form || req.query.form;
      req.query.district = ctx.district;

      exportDataV1.get(req.query, function(err, exportDataResult) {
        if (err) {
          return serverUtils.error(err, req, res);
        }

        writeExportHeaders(res, req.params.type, formats[req.query.format] || formats.csv);

        if (_.isFunction(exportDataResult)) {
          // wants to stream the result back
          exportDataResult(res.write.bind(res), res.end.bind(res));
        } else {
          // has already generated result to return
          res.send(exportDataResult);
        }
      });
    });
  },
  routeV2: (req, res) => {
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
    };

    const type = req.params.type,
          filters = (req.body && req.body.filters) ||
                    (req.query && req.query.filters) || {},
          options = (req.body && req.body.options) ||
                    (req.query && req.query.options) || {};

    correctFilterTypes(filters);

    if (!exportDataV2.supportedExports.includes(type)) {
      return serverUtils.error({
        message: `v2 export only supports ${exportDataV2.supportedExports}`,
        code: 404
      }, req, res);
    }

    console.log('v2 export requested for', type);
    console.log('params:', JSON.stringify(filters, null, 2));
    console.log('options:', JSON.stringify(options, null, 2));

    // We currently only support online users (CouchDB admins and National Admins)
    // If we want to support offline users we should either:
    //  - Forcibly scope their search object to their facility, which is returned
    //    by the following auth check in ctx.district (maybe?)
    //  - Still don't let offline users use this API, and instead refactor the
    //    export logic so it can be used in webapp, and have exports works offline
    return auth.check(req, ['national_admin', getExportPermission(req.params.type)])
      .then(() => {
        writeExportHeaders(res, req.params.type, formats.csv);

        // To respond as quickly to the request as possible
        res.flushHeaders();

        const d = domain.create();
        d.on('error', err => {
          // Because we've already flushed the headers above we can't use
          // serverUtils anymore, we just have to close the connection
          console.error('Error exporting v2 data for', type);
          console.error('params:', JSON.stringify(filters, null, 2));
          console.error('options:', JSON.stringify(options, null, 2));
          console.error(err);
          res.end(`--ERROR--\nError exporting data: ${err.message}\n`);
        });
        d.run(() =>
          exportDataV2
            .export(type, filters, options)
            .pipe(res));
      }).catch(err => serverUtils.error(err, req, res));
      // TODO: ^^^ it would be nice to just return the Promise chain and have
      //       express deal with it
  }
};
