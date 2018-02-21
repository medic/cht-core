const moment = require('moment'),
      createDomain = require('domain').create,
      serverUtils = require('../server-utils');

const exportData1 = require('../services/export-data');
const exportData2 = require('../services/export-data-2');

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

const exportPermission = function(type) {
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
  exportPermission: exportPermission,
  v1: ({res, req, userCtx}) => {
    req.query.type = req.params.type;
    req.query.form = req.params.form || req.query.form;
    req.query.district = userCtx.district;
    return new Promise((resolve, reject) => {
      exportData1.get(req.query, (err, exportDataResult) => {
        if (err) {
          return reject(err);
        }

        writeExportHeaders(res, req.params.type, formats[req.query.format] || formats.csv);

        if (_.isFunction(exportDataResult)) {
          // wants to stream the result back
          exportDataResult(res.write.bind(res), res.end.bind(res));
        } else {
          // has already generated result to return
          res.send(exportDataResult);
        }

        resolve();
      });
    });
  },
  // NB: we only support online users (CouchDB admins and National Admins)
  // If we want to support offline users we should either:
  //  - Forcibly scope their search object to their facility, which is returned
  //    by the following auth check in ctx.district (maybe?)
  //  - Still don't let offline users use this API, and instead refactor the
  //    export logic so it can be used in webapp, and have exports works offline
  v2: ({res, req}) => {
      const type = req.params.type,
            filters = (req.body && req.body.filters) ||
                      (req.query && req.query.filters) || {},
            options = (req.body && req.body.options) ||
                      (req.query && req.query.options) || {};

      if (!exportData2.supportedExports.includes(type)) {
        throw {
          message: `v2 export only supports ${exportData2.supportedExports}`,
          code: 404
        };
      }

      writeExportHeaders(res, req.params.type, formats.csv);

      const d = createDomain();
      d.on('error', err => serverUtils.error(err, req, res));
      d.run(() =>
        exportData2
          .export(type, filters, options)
          .pipe(res));
  }
};
