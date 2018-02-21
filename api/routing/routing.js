const _ = require('underscore'),
      auth = require('../auth'),
      createDomain = require('domain').create,
      db = require('../db'),
      moment = require('moment'),
      serverUtils = require('../server-utils');

// TODO: move these controller links to not dominate the whole file
const activePregnancies = require('../controllers/active-pregnancies'),
      deliveryLocation = require('../controllers/delivery-location'),
      exportData = require('../controllers/export-data'),
      exportData2 = require('../controllers/export-data-2'),
      forms = require('../controllers/forms'),
      fti = require('../controllers/fti'),
      highRisk = require('../controllers/high-risk'),
      messages = require('../controllers/messages'),
      missedAppointments = require('../controllers/missed-appointments'),
      missingDeliveryReports = require('../controllers/missing-delivery-reports'),
      monthlyDeliveries = require('../controllers/monthly-deliveries'),
      monthlyRegistrations = require('../controllers/monthly-registrations'),
      people = require('../controllers/people'),
      places = require('../controllers/places'),
      records = require('../controllers/records'),
      smsGateway = require('../controllers/sms-gateway'),
      totalBirths = require('../controllers/total-births'),
      upcomingAppointments = require('../controllers/upcoming-appointments'),
      upcomingDueDates = require('../controllers/upcoming-due-dates'),
      upgrade = require('../controllers/upgrade'),
      users = require('../controllers/users'),
      visitsCompleted = require('../controllers/visits-completed'),
      visitsDuring = require('../controllers/visits-during');

// TODO: use and refine this
// TODO: consider an api for what is passed through to controllers, so instead
// you just pass the requires in and it knows how to hook it up.
// const route = (method, path, permissions, fn) => undefined;

module.exports = {
  route: (app, proxy, {jsonParser, formParser, pathPrefix}) => {
    app.get('/setup/poll', function(req, res) {
      var p = require('./package.json');
      res.json({
        ready: true,
        handler: 'medic-api', version: p.version,
        detail: 'All required services are running normally'
      });
    });

    app.all('/setup', function(req, res) {
      res.status(503).send('Setup services are not currently available');
    });

    app.all('/setup/password', function(req, res) {
      res.status(503).send('Setup services are not currently available');
    });

    app.all('/setup/finish', function(req, res) {
      res.status(200).send('Setup services are not currently available');
    });

    app.get('/api/info', function(req, res) {
      var p = require('./package.json');
      res.json({ version: p.version });
    });

    app.get('/api/auth/:path', function(req, res) {
      auth.checkUrl(req, function(err, output) {
        if (err) {
          return serverUtils.serverError(err, req, res);
        }
        if (output.status >= 400 && output.status < 500) {
          res.status(403).send('Forbidden');
        } else {
          res.json(output);
        }
      });
    });

    app.postJson('/api/v1/upgrade', (req, res) => {
      auth.check(req, '_admin', null, (err, userCtx) => {
        if (err) {
          return serverUtils.error(err, req, res);
        }

        var buildInfo = req.body.build;
        if (!buildInfo) {
          return serverUtils.error({
            message: 'You must provide a build info body',
            status: 400
          }, req, res);
        }

        upgrade(req.body.build, userCtx.user)
          .then(() => res.json({ ok: true }))
          .catch(err => serverUtils.error(err, req, res));
      });
    });

    var handleAnalyticsCall = function(req, res, controller) {
      auth.check(req, 'can_view_analytics', req.query.district, function(err, ctx) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        controller.get({ district: ctx.district }, function(err, obj) {
          if (err) {
            return serverUtils.serverError(err, req, res);
          }
          res.json(obj);
        });
      });
    };

    var emptyJSONBodyError = function(req, res) {
      return serverUtils.error({
        code: 400,
        message: 'Request body is empty or Content-Type header was not set to application/json.'
      }, req, res);
    };

    app.get('/api/active-pregnancies', function(req, res) {
      handleAnalyticsCall(req, res, activePregnancies);
    });

    app.get('/api/upcoming-appointments', function(req, res) {
      handleAnalyticsCall(req, res, upcomingAppointments);
    });

    app.get('/api/missed-appointments', function(req, res) {
      handleAnalyticsCall(req, res, missedAppointments);
    });

    app.get('/api/upcoming-due-dates', function(req, res) {
      handleAnalyticsCall(req, res, upcomingDueDates);
    });

    app.get('/api/sms/', function(req, res) {
      res.redirect(301, '/api/sms');
    });
    app.get('/api/sms', function(req, res) {
      auth.check(req, 'can_access_gateway_api', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        smsGateway.get(function(err, obj) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          res.json(obj);
        });
      });
    });

    app.post('/api/sms/', function(req, res) {
      res.redirect(301, '/api/sms');
    });
    app.postJson('/api/sms', function(req, res) {
      auth.check(req, 'can_access_gateway_api', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        smsGateway.post(req, function(err, obj) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          res.json(obj);
        });
      });
    });

    app.get('/api/high-risk', function(req, res) {
      handleAnalyticsCall(req, res, highRisk);
    });

    app.get('/api/total-births', function(req, res) {
      handleAnalyticsCall(req, res, totalBirths);
    });

    app.get('/api/missing-delivery-reports', function(req, res) {
      handleAnalyticsCall(req, res, missingDeliveryReports);
    });

    app.get('/api/delivery-location', function(req, res) {
      handleAnalyticsCall(req, res, deliveryLocation);
    });

    app.get('/api/visits-completed', function(req, res) {
      handleAnalyticsCall(req, res, visitsCompleted);
    });

    app.get('/api/visits-during', function(req, res) {
      handleAnalyticsCall(req, res, visitsDuring);
    });

    app.get('/api/monthly-registrations', function(req, res) {
      handleAnalyticsCall(req, res, monthlyRegistrations);
    });

    app.get('/api/monthly-deliveries', function(req, res) {
      handleAnalyticsCall(req, res, monthlyDeliveries);
    });

    var formats = {
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

    var getExportPermission = function(type) {
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

    app.all([
      '/api/v1/export/:type/:form?',
      '/' + db.getPath() + '/export/:type/:form?'
    ], function(req, res) {
      auth.check(req, getExportPermission(req.params.type), req.query.district, function(err, ctx) {
        if (err) {
          return serverUtils.error(err, req, res, true);
        }
        req.query.type = req.params.type;
        req.query.form = req.params.form || req.query.form;
        req.query.district = ctx.district;
        exportData.get(req.query, function(err, exportDataResult) {
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
    });

    const exportDataV2 = (req, res) => {
      const type = req.params.type,
            filters = (req.body && req.body.filters) ||
                      (req.query && req.query.filters) || {},
            options = (req.body && req.body.options) ||
                      (req.query && req.query.options) || {};

      if (!exportData2.supportedExports.includes(type)) {
        return serverUtils.error({
          message: `v2 export only supports ${exportData2.supportedExports}`,
          code: 404
        }, req, res);
      }

      // We currently only support online users (CouchDB admins and National Admins)
      // If we want to support offline users we should either:
      //  - Forcibly scope their search object to their facility, which is returned
      //    by the following auth check in ctx.district (maybe?)
      //  - Still don't let offline users use this API, and instead refactor the
      //    export logic so it can be used in webapp, and have exports works offline
      auth.check(req, ['national_admin', getExportPermission(req.params.type)], null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }

        writeExportHeaders(res, req.params.type, formats.csv);

        const d = createDomain();
        d.on('error', err => serverUtils.error(err, req, res));
        d.run(() =>
          exportData2
            .export(type, filters, options)
            .pipe(res));
      });
    };

    app.get('/api/v2/export/:type', exportDataV2);
    app.postJson('/api/v2/export/:type', exportDataV2);

    app.get('/api/v1/fti/:view', function(req, res) {
      auth.check(req, 'can_view_data_records', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        auth.check(req, 'can_view_unallocated_data_records', null, function(err, ctx) {
          var queryOptions = _.pick(req.query, 'q', 'schema', 'sort', 'skip', 'limit', 'include_docs');
          queryOptions.allocatedOnly = !!err;
          fti.get(req.params.view, queryOptions, ctx && ctx.district, function(err, result) {
            if (err) {
              return serverUtils.serverError(err.message, req, res);
            }
            res.json(result);
          });
        });
      });
    });

    app.get('/api/v1/messages', function(req, res) {
      auth.check(req, ['can_view_data_records','can_view_unallocated_data_records'], null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res, true);
        }
        var opts = _.pick(req.query, 'limit', 'start', 'descending', 'state', 'states');
        messages.getMessages(opts, function(err, result) {
          if (err) {
            return serverUtils.serverError(err.message, req, res);
          }
          res.json(result);
        });
      });
    });

    app.get('/api/v1/messages/:id', function(req, res) {
      auth.check(req, ['can_view_data_records','can_view_unallocated_data_records'], null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res, true);
        }
        messages.getMessage(req.params.id, function(err, result) {
          if (err) {
            return serverUtils.serverError(err.message, req, res);
          }
          res.json(result);
        });
      });
    });

    app.putJson('/api/v1/messages/state/:id', function(req, res) {
      auth.check(req, 'can_update_messages', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res, true);
        }
        messages.updateMessageTaskState({
          messageId: req.params.id,
          state: req.body.state,
          details: req.body.details
        }, function(err, result) {
          if (err) {
            return serverUtils.serverError(err.message, req, res);
          }
          result.id = req.params.id;
          res.json(result);
        });
      });
    });

    app.post('/api/v1/records', [jsonParser, formParser], function(req, res) {
      auth.check(req, 'can_create_records', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res, true);
        }
        records.create(req.body, req.is(['json','urlencoded']), function(err, result) {
          if (err) {
            return serverUtils.serverError(err, req, res);
          }
          res.json(result);
        });
      });
    });

    app.get('/api/v1/forms', function(req, res) {
      forms.listForms(req.headers, function(err, body, headers) {
        if (err) {
          return serverUtils.serverError(err, req, res);
        }
        if (headers) {
          res.writeHead(headers.statusCode || 200, headers);
        }
        res.end(body);
      });
    });

    app.get('/api/v1/forms/:form', function(req, res) {
      var parts = req.params.form.split('.'),
          form = parts.slice(0, -1).join('.'),
          format = parts.slice(-1)[0];
      if (!form || !format) {
        return serverUtils.error({
          code: 400,
          message: `Invalid form parameter (form="${form}", format="${format}")`
        }, req, res);
      }
      forms.getForm(form, format, function(err, body, headers) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        if (headers) {
          res.writeHead(headers.statusCode || 200, headers);
        }
        res.end(body);
      });
    });

    app.get('/api/v1/users', function(req, res) {
      auth.check(req, 'can_view_users', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        users.getList(function(err, body) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          res.json(body);
        });
      });
    });

    app.postJson('/api/v1/users', function(req, res) {
      auth.check(req, 'can_create_users', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        users.createUser(req.body, function(err, body) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          res.json(body);
        });
      });
    });

    /*
     * TODO: move this logic out of here
     *       https://github.com/medic/medic-webapp/issues/4092
     */
    app.postJson('/api/v1/users/:username', function(req, res) {
      if (_.isEmpty(req.body)) {
        return emptyJSONBodyError(req, res);
      }

      const username = req.params.username;
      const credentials = auth.basicAuthCredentials(req);

      const updateUser = fullAccess =>
        users.updateUser(username, req.body, fullAccess, (err, body) => {
          if (err) {
            return serverUtils.error(err, req, res);
          }

          res.json(body);
        });

      const hasFullPermission = () =>
        new Promise((resolve, reject) => auth.check(req, 'can_update_users', null, err => {
          if (err && err.code === 403) {
            resolve(false);
          } else if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        }));
      const isUpdatingSelf = () =>
        new Promise((resolve, reject) => auth.getUserCtx(req, (err, userCtx) => {
          if (err) {
            reject(err);
          } else if (userCtx.name === username && (!credentials || credentials.username === username)) {
            resolve(true);
          } else {
            resolve(false);
          }
        }));
      const basicAuthValid = () =>
        new Promise(resolve => {
          if (!credentials) {
            resolve(null); // Not attempting basic auth
          } else {
            auth.validateBasicAuth(credentials, err => {
              if (err) {
                console.error(`Invalid authorization attempt on /api/v1/users/${username}`);
                console.error(err);
                resolve(false); // Incorrect basic auth
              } else {
                resolve(true); // Correct basic auth
              }
            });
          }
        });
      const isChangingPassword = () => Object.keys(req.body).includes('password');

      Promise.all([hasFullPermission(), isUpdatingSelf(), basicAuthValid(), isChangingPassword()])
        .then(([fullPermission, updatingSelf, basic, changingPassword]) => {

          if (basic === false) {
            // If you're passing basic auth we're going to validate it, even if we
            // technicaly don't need to (because you already have a valid cookie and
            // full permission).
            // This is to maintain consistency in the personal change password UI:
            // we want to validate the password you pass regardless of your permissions
            throw {
              message: 'Bad username / password',
              code: 401
            };
          }

          if (fullPermission) {
            return updateUser(true);
          }

          if (!updatingSelf) {
            throw {
              message: 'You do not have permissions to modify this person',
              code: 403
            };
          }

          if (basic === null && changingPassword) {
            throw {
              message: 'You must authenticate with Basic Auth to modify your password',
              code: 403
            };
          }

          return updateUser(false);
        })
        .catch(err => {
          return serverUtils.error(err, req, res);
        });
    });

    app.delete('/api/v1/users/:username', function(req, res) {
      auth.check(req, 'can_delete_users', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        users.deleteUser(req.params.username, function(err, result) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          res.json(result);
        });
      });
    });

    app.postJson('/api/v1/places', function(req, res) {
      auth.check(req, 'can_create_places', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        if (_.isEmpty(req.body)) {
          return emptyJSONBodyError(req, res);
        }
        places.createPlace(req.body, function(err, body) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          res.json(body);
        });
      });
    });

    app.postJson('/api/v1/places/:id', function(req, res) {
      auth.check(req, 'can_update_places', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        if (_.isEmpty(req.body)) {
          return emptyJSONBodyError(req, res);
        }
        places.updatePlace(req.params.id, req.body, function(err, body) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          res.json(body);
        });
      });
    });

    app.postJson('/api/v1/people', function(req, res) {
      auth.check(req, 'can_create_people', null, function(err) {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        if (_.isEmpty(req.body)) {
          return emptyJSONBodyError(req, res);
        }
        people.createPerson(req.body, function(err, body) {
          if (err) {
            return serverUtils.error(err, req, res);
          }
          res.json(body);
        });
      });
    });

    // DB replication endpoint
    var changesHander = _.partial(require('../handlers/changes').request, proxy);
    app.get(pathPrefix + '_changes', changesHander);
    app.postJson(pathPrefix + '_changes', changesHander);

    // Attempting to create the user's personal meta db
    app.put('/medic-user-\*-meta/', (req, res) => {
      require('./controllers/create-user-db')(req, err => {
        if (err) {
          return serverUtils.error(err, req, res);
        }
        res.json({ ok: true });
      });
    });
  }
};
