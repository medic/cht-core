var _ = require('underscore'),
    async = require('async'),
    bodyParser = require('body-parser'),
    express = require('express'),
    morgan = require('morgan'),
    moment = require('moment'),
    path = require('path'),
    app = express(),
    db = require('./db'),
    config = require('./config'),
    auth = require('./auth'),
    isClientHuman = require('./is-client-human'),
    scheduler = require('./scheduler'),
    AuditProxy = require('./audit-proxy'),
    migrations = require('./migrations'),
    ddocExtraction = require('./ddoc-extraction'),
    translations = require('./translations'),
    target = 'http://' + db.settings.host + ':' + db.settings.port,
    proxy = require('http-proxy').createProxyServer({ target: target }),
    proxyForAuditing = require('http-proxy').createProxyServer({ target: target }),
    login = require('./controllers/login'),
    activePregnancies = require('./controllers/active-pregnancies'),
    upcomingAppointments = require('./controllers/upcoming-appointments'),
    missedAppointments = require('./controllers/missed-appointments'),
    upcomingDueDates = require('./controllers/upcoming-due-dates'),
    smsGateway = require('./controllers/sms-gateway'),
    highRisk = require('./controllers/high-risk'),
    totalBirths = require('./controllers/total-births'),
    missingDeliveryReports = require('./controllers/missing-delivery-reports'),
    deliveryLocation = require('./controllers/delivery-location'),
    visitsCompleted = require('./controllers/visits-completed'),
    visitsDuring = require('./controllers/visits-during'),
    monthlyRegistrations = require('./controllers/monthly-registrations'),
    monthlyDeliveries = require('./controllers/monthly-deliveries'),
    exportData = require('./controllers/export-data'),
    messages = require('./controllers/messages'),
    records = require('./controllers/records'),
    forms = require('./controllers/forms'),
    users = require('./controllers/users'),
    places = require('./controllers/places'),
    people = require('./controllers/people'),
    upgrade = require('./controllers/upgrade'),
    fti = require('./controllers/fti'),
    createDomain = require('domain').create,
    staticResources = /\/(templates|static)\//,
    favicon = /\/icon_\d\d.ico$/,
    appcacheManifest = /\/manifest\.appcache$/,
    pathPrefix = '/' + db.settings.db + '/',
    appPrefix = pathPrefix + '_design/' + db.settings.ddoc + '/_rewrite/',
    serverUtils = require('./server-utils'),
    apiPort = process.env.API_PORT || 5988;

// requires content-type application/json header
var jsonParser = bodyParser.json({limit: '32mb'});

const handleJsonRequest = (method, path, callback) => {
  app[method](path, jsonParser, (req, res) => {
    const contentType = req.headers['content-type'];
    if (!contentType || contentType !== 'application/json') {
      return serverUtils.error({
        code: 400,
        message: 'Content-Type must be application/json'
      }, req, res);
    } else {
      callback(req, res);
    }
  });
};
app.deleteJson = (path, callback) => handleJsonRequest('delete', path, callback);
app.postJson   = (path, callback) => handleJsonRequest('post',   path, callback);
app.putJson    = (path, callback) => handleJsonRequest('put',    path, callback);

// requires content-type application/x-www-form-urlencoded header
var formParser = bodyParser.urlencoded({limit: '32mb', extended: false});

app.set('strict routing', true);

app.use(morgan('combined', {
  immediate: true
}));

app.use(function(req, res, next) {
  var domain = createDomain();
  domain.on('error', function(err) {
    console.error('UNCAUGHT EXCEPTION!');
    serverUtils.serverError(err, req, res);
    domain.dispose();
    process.exit(1);
  });
  domain.enter();
  next();
});

app.get('/', function(req, res) {
  if (req.headers.accept === 'application/json') {
    // couchdb request - let it go
    proxy.web(req, res);
  } else {
    // redirect to the app path - redirect to _rewrite
    res.redirect(appPrefix);
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get(pathPrefix + 'login', login.get);
app.postJson(pathPrefix + 'login', login.post);

var UNAUDITED_ENDPOINTS = [
  // This takes arbitrary JSON, not whole documents with `_id`s, so it's not
  // auditable in our current framework
  '_design/' + db.settings.ddoc + '/_rewrite/update_settings/*',
  // Replication machinery we don't care to audit
  '_local/*',
  '_revs_diff',
  '_missing_revs',
  // These may use POST for specifiying ids
  // NB: _changes is dealt with elsewhere: see `changesHandler`
  '_all_docs',
  '_bulk_get',
  '_design/*/_list/*',
  '_design/*/_show/*',
  '_design/*/_view/*',
  // Interacting with mongo filters uses POST
  '_find',
  '_explain'
];

UNAUDITED_ENDPOINTS.forEach(function(url) {
  // NB: as this evaluates first, it will skip any hooks defined in the rest of
  // the file below, and these calls will all be proxies. If you want to avoid
  // auditing and do other things as well, look to how the _changes feed is
  // handled.
  app.all(pathPrefix +  url, function(req, res) {
    proxy.web(req, res);
  });
});

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

app.post('/api/v1/upgrade', jsonParser, (req, res) => {
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

      var format = formats[req.query.format] || formats.csv;
      var filename = req.params.type + '-' +
                     moment().format('YYYYMMDDHHmm') +
                     '.' + format.extension;
      res
        .set('Content-Type', format.contentType)
        .set('Content-Disposition', 'attachment; filename=' + filename);

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
        return serverUtils.serverError(err.message, req, res);
      }
      res.json(result);
    });
  });
});

app.get('/api/v1/scheduler/:name', function(req, res) {
  auth.check(req, 'can_execute_schedules', null, function(err) {
    if (err) {
      return serverUtils.error(err, req, res, true);
    }
    scheduler.exec(req.params.name, function(err) {
      if (err) {
        return serverUtils.serverError(err.message, req, res);
      }
      res.json({ schedule: req.params.name, result: 'success' });
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

app.postJson('/api/v1/users/:username', function(req, res) {
  auth.check(req, 'can_update_users', null, function(err) {
    if (err) {
      return serverUtils.error(err, req, res);
    }
    if (_.isEmpty(req.body)) {
      return emptyJSONBodyError(req, res);
    }
    users.updateUser(req.params.username, req.body, function(err, body) {
      if (err) {
        return serverUtils.error(err, req, res);
      }
      res.json(body);
    });
  });
});

app.deleteJson('/api/v1/users/:username', function(req, res) {
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
var changesHander = _.partial(require('./handlers/changes').request, proxy);
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

var writeHeaders = function(req, res, headers, redirectHumans) {
  res.oldWriteHead = res.writeHead;
  res.writeHead = function(_statusCode, _headers) {
    // hardcode this so we do not show the basic auth prompt by default
    res.setHeader('WWW-Authenticate', 'Cookie');
    if (headers) {
      headers.forEach(function(header) {
        res.setHeader(header[0], header[1]);
      });
    }
    // for dynamic resources, redirect humans to login page
    if (_statusCode === 401) {
      if (isClientHuman(req)) {
        if (redirectHumans) {
          _statusCode = 302;
          res.setHeader(
            'Location',
            pathPrefix + 'login?redirect=' + encodeURIComponent(req.url)
          );
        }
      } else {
        res.setHeader('WWW-Authenticate', serverUtils.MEDIC_BASIC_AUTH);
      }
    }
    res.oldWriteHead(_statusCode, _headers);
  };
};

/**
 * Set cache control on static resources. Must be hacked in to
 * ensure we set the value first.
 */
proxy.on('proxyReq', function(proxyReq, req, res) {
  if (favicon.test(req.url)) {
    // Cache for a week.  Normally we don't interferse with couch headers, but
    // due to Chrome (including Android WebView) aggressively requesting
    // favicons on every page change and window.history update
    // (https://github.com/medic/medic-webapp/issues/1913 ), we have to stage an
    // intervention:
    writeHeaders(req, res, [
      [ 'Cache-Control', 'public, max-age=604800' ],
    ]);
  } else if (appcacheManifest.test(req.url)) {
    // requesting the appcache manifest
    writeHeaders(req, res, [
      [ 'Cache-Control', 'must-revalidate' ],
      [ 'Content-Type', 'text/cache-manifest; charset=utf-8' ],
      [ 'Last-Modified', 'Tue, 28 Apr 2015 02:23:40 GMT' ],
      [ 'Expires', 'Tue, 28 Apr 2015 02:21:40 GMT' ]
    ]);
  } else if (!staticResources.test(req.url) && req.url.indexOf(appPrefix) !== -1) {
    // requesting other application files
    writeHeaders(req, res, [], true);
  } else {
    // everything else
    writeHeaders(req, res);
  }
});

/**
 * Make sure requests to these urls sans trailing / are redirected to the
 * correct slashed endpoint to avoid weird bugs
 */
[
  appPrefix,
  pathPrefix
].forEach(function(url) {
  var urlSansTrailingSlash = url.slice(0, - 1);
  app.get(urlSansTrailingSlash, function(req, res) {
    res.redirect(url);
  });
});

var audit = function(req, res) {
  var ap = new AuditProxy();
  ap.on('error', function(e) {
    serverUtils.serverError(e, req, res);
  });
  ap.on('not-authorized', function() {
    serverUtils.notLoggedIn(req, res);
  });
  ap.audit(proxyForAuditing, req, res);
};

var auditPath = pathPrefix + '*';
app.put(auditPath, audit);
app.post(auditPath, audit);
app.delete(auditPath, audit);

app.all('*', function(req, res) {
  proxy.web(req, res);
});

proxy.on('error', function(err, req, res) {
  serverUtils.serverError(JSON.stringify(err), req, res);
});

proxyForAuditing.on('error', function(err, req, res) {
  serverUtils.serverError(JSON.stringify(err), req, res);
});

const nodeVersionCheck = callback => {
  try {
    const [major, minor, patch] = process.versions.node.split('.').map(Number);
    const environment = app.get('env');

    console.log(`Node Version: ${major}.${minor}.${patch} running in ${environment} mode`);

    if (major < 5) {
      // 5 seems to be where the majority of ES6 was added without flags.
      // Seems safeist to not allow api to run
      callback(new Error(`Node version ${major}.${minor}.${patch} is not supported`));
    }

    if (major < 6 || ( major === 6 && minor < 5)) {
      console.error('We recommend nodejs 6.5 or higher.');
    }

    callback();
  } catch (error) {
    callback(error);
  }
};

const envVarsCheck = callback => {
  const envValueAndExample = [
    ['COUCH_URL', 'http://admin:pass@localhost:5984/medic'],
    ['COUCH_NODE_NAME', 'couchdb@localhost']
  ];

  const failures = [];
  envValueAndExample.forEach(([envVar, example]) => {
    if (!process.env[envVar]) {
      failures.push(`${envVar} must be set. For example: ${envVar}=${example}`);
    }
  });

  if (failures.length) {
    callback('At least one required environment variable was not set:\n' + failures.join('\n'));
  } else {
    callback();
  }
};

const couchDbNoAdminPartyModeCheck = callback => {
  const url = require('url'),
        noAuthUrl = url.parse(process.env.COUCH_URL),
        protocol = noAuthUrl.protocol.replace(':', ''),
        net = require(protocol);

  delete noAuthUrl.auth;

  net.get(url.format(noAuthUrl), ({statusCode}) => {
    // We expect to be rejected because we didn't provide auth
    if (statusCode === 401) {
      callback();
    } else {
      console.error('Expected a 401 when accessing db without authentication.');
      console.error(`Instead we got a ${statusCode}`).
      callback(new Error('CouchDB security seems to be misconfigured, see: https://github.com/medic/medic-webapp#enabling-a-secure-couchdb'));
    }
  });
};

const couchDbVersionCheck = callback =>
  db.getCouchDbVersion((err, version) => {
    if (err) {
      callback(err);
    }

    console.log(`CouchDB Version: ${version.major}.${version.minor}.${version.patch}`);
    callback();
  });

const asyncLog = message => async.asyncify(() => console.log(message));

async.series([
  nodeVersionCheck,
  envVarsCheck,
  couchDbNoAdminPartyModeCheck,
  couchDbVersionCheck,
  ddocExtraction.run,
  asyncLog('DDoc extraction completed successfully'),
  config.load,
  asyncLog('Configuration loaded successfully'),
  async.asyncify(config.listen),
  translations.run,
  asyncLog('Translations merged successfully'),
  migrations.run,
  asyncLog('Database migrations completed successfully'),
  async.asyncify(scheduler.init)
], err => {
  if (err) {
    console.error('Fatal error initialising medic-api');
    console.error(err);
    process.exit(1);
  }

  app.listen(apiPort, () =>
    console.log('Medic API listening on port ' + apiPort));
});

// Define error-handling middleware last.
// http://expressjs.com/guide/error-handling.html
app.use((err, req, res, next) => { // jshint ignore:line
  serverUtils.serverError(err, req, res);
});
