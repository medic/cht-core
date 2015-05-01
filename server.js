var _ = require('underscore'),
    bodyParser = require('body-parser'),
    express = require('express'),
    morgan = require('morgan'),
    http = require('http'),
    moment = require('moment'),
    app = express(),
    db = require('./db'),
    config = require('./config'),
    auth = require('./auth'),
    scheduler = require('./scheduler'),
    AuditProxy = require('./audit-proxy'),
    migrations = require('./migrations'),
    translations = require('./translations'),
    target = 'http://' + db.settings.host + ':' + db.settings.port,
    proxy = require('http-proxy').createProxyServer({ target: target }),
    proxyForAuditing = require('http-proxy').createProxyServer({ target: target }),
    activePregnancies = require('./controllers/active-pregnancies'),
    upcomingAppointments = require('./controllers/upcoming-appointments'),
    missedAppointments = require('./controllers/missed-appointments'),
    upcomingDueDates = require('./controllers/upcoming-due-dates'),
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
    fti = require('./controllers/fti'),
    createDomain = require('domain').create,
    staticResources = /\/(templates|static)\//,
    appcacheManifest = /manifest\.appcache/;

http.globalAgent.maxSockets = 100;

app.use(morgan('combined', {
  immediate: true
}));

app.use(function(req, res, next) {
  var domain = createDomain();
  domain.on('error', function(err) {
    console.error('UNCAUGHT EXCEPTION!');
    console.error(err);
    serverError(err, res);
    domain.dispose();
    process.exit(1);
  });
  domain.enter();
  next();
});

app.use(function(err, req, res, next) {
  serverError(err.stack, res);
});

// create application/json parser
var jsonParser = bodyParser.json();

app.all('*/update_settings/*', function(req, res) {
  // don't audit the app settings
  proxy.web(req, res);
});

var audit = function(req, res) {
  var ap = new AuditProxy();
  ap.on('error', function(e) {
    serverError(e, res);
  });
  ap.on('not-authorized', function() {
    notLoggedIn(res);
  });
  ap.audit(proxyForAuditing, req, res);
};

var auditPath = db.settings.db + '*';
app.put(auditPath, audit);
app.post(auditPath, audit);
app.delete(auditPath, audit);

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
      return serverError(err, res);
    }
    if (output.status >= 400 && output.status < 500) {
      res.status(403).send('Forbidden');
    } else {
      res.json(output);
    }
  });
});

var handleAnalyticsCall = function(req, res, controller) {
  auth.check(req, 'can_view_analytics', req.query.district, function(err, ctx) {
    if (err) {
      return error(err, res);
    }
    controller.get({ district: ctx.district }, function(err, obj) {
      if (err) {
        return serverError(err, res);
      }
      res.json(obj);
    });
  });
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
  return 'can_export_messages';
};

app.get(db.getPath() + '/export/:type/:form?', function(req, res) {
  var url = '/api/v1/export/' + req.params.type;
  if (req.params.form) {
    url += '/' + req.params.form;
  }
  res.redirect(301, url);
});

app.get('/api/v1/export/:type/:form?', function(req, res) {
  auth.check(req, getExportPermission(req.params.type), req.query.district, function(err, ctx) {
    if (err) {
      return error(err, res);
    }
    req.query.type = req.params.type;
    req.query.form = req.params.form || req.query.form;
    req.query.district = ctx.district;
    exportData.get(req.query, function(err, obj) {
      if (err) {
        return serverError(err, res);
      }
      var format = formats[req.query.format] || formats.csv;
      var filename = req.params.type + '-' +
                     moment().format('YYYYMMDDHHmm') +
                     '.' + format.extension;
      res
        .set('Content-Type', format.contentType)
        .set('Content-Disposition', 'attachment; filename=' + filename)
        .send(obj);
    });
  });
});

app.get('/api/v1/fti/:view', function(req, res) {
  auth.check(req, 'can_view_data_records', null, function(err, ctx) {
    if (err) {
      return error(err, res);
    }
    auth.check(req, 'can_view_unallocated_data_records', null, function(err, ctx) {
      var queryOptions = _.pick(req.query, 'q', 'schema', 'sort', 'skip', 'limit', 'include_docs');
      queryOptions.allocatedOnly = !!err;
      fti.get(req.params.view, queryOptions, ctx && ctx.district, function(err, result) {
        if (err) {
          return serverError(err.message, res);
        }
        res.json(result);
      });
    });
  });
});

app.get('/api/v1/messages', function(req, res) {
  auth.check(req, 'can_view_data_records', null, function(err, ctx) {
    if (err) {
      return error(err, res);
    }
    auth.check(req, 'can_view_unallocated_data_records', null, function(err, ctx) {
      if (err) {
        return error(err, res);
      }
      var opts = _.pick(req.query, 'limit', 'start', 'descending', 'state');
      messages.getMessages(opts, ctx && ctx.district, function(err, result) {
        if (err) {
          console.error(err);
          return error(err, res);
        }
        res.json(result);
      });
    });
  });
});

app.get('/api/v1/messages/:id', function(req, res) {
  auth.check(req, 'can_view_data_records', null, function(err, ctx) {
    if (err) {
      return error(err, res);
    }
    auth.check(req, 'can_view_unallocated_data_records', null, function(err, ctx) {
      if (err) {
        return error(err, res);
      }
      messages.getMessage(req.params.id, ctx && ctx.district, function(err, result) {
        if (err) {
          return error(err, res);
        }
        res.json(result);
      });
    });
  });
});

app.put('/api/v1/messages/state/:id', jsonParser, function(req, res) {
  auth.check(req, 'can_update_messages', null, function(err, ctx) {
    if (err) {
      return error(err, res);
    }
    messages.updateMessage(req.params.id, req.body, ctx && ctx.district, function(err, result) {
      if (err) {
        return error(err, res);
      }
      res.json(result);
    });
  });
});

app.post('/api/v1/records', jsonParser, function(req, res) {
  res.json({code: 500, message: "coming soon"});
});

/**
 * Set cache control on static resources. Must be hacked in to
 * ensure we set the value first.
 */
proxy.on('proxyReq', function(proxyReq, req, res) {
  if (appcacheManifest.test(req.url)) {
    res.oldWriteHead = res.writeHead;
    res.writeHead = function(statusCode, headers) {
      res.setHeader('Cache-Control', 'must-revalidate');
      res.setHeader('Content-Type', 'text/cache-manifest; charset=utf-8');
      res.setHeader('Last-Modified', 'Tue, 28 Apr 2015 02:23:40 GMT');
      res.setHeader('Expires', 'Tue, 28 Apr 2015 02:21:40 GMT');
      res.oldWriteHead(statusCode, headers);
    };
  } else if (staticResources.test(req.url)) {
    res.oldWriteHead = res.writeHead;
    res.writeHead = function(statusCode, headers) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.oldWriteHead(statusCode, headers);
    };
  }
});

app.all('*', function(req, res) {
  proxy.web(req, res);
});

proxy.on('error', function(err, req, res) {
  serverError(JSON.stringify(err), res);
});

proxyForAuditing.on('error', function(err, req, res) {
  serverError(JSON.stringify(err), res);
});

var error = function(err, res) {
  if (err.code === 500) {
    return serverError(err.message, res);
  }
  if (err.code === 401) {
    return notLoggedIn(res);
  }
  res.writeHead(err.code, {
    'Content-Type': 'text/plain'
  });
  res.end(err.message);
};

var serverError = function(err, res) {
  console.error('Server error: ' + (err.stack || JSON.stringify(err)));
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  res.end('Server error');
};

var notLoggedIn = function(res) {
  res.writeHead(401, {
    'Content-Type': 'text/plain',
    'WWW-Authenticate': 'Basic realm="Medic Mobile Web Services"'
  });
  res.end('Not logged in');
};

migrations.run(function(err) {
  if (err) {
    console.error(err);
  } else {
    console.log('Database migrations completed successfully');
  }
});

config.load(function(err) {
  if (err) {
    console.error('Error loading config', err);
    process.exit(1);
  }
  translations.run(function(err) {
    if (err) {
      return console.error('Error merging translations', err);
    }
    console.log('Translations merged successfully');
  });
  config.listen();
  scheduler.init();
  app.listen(5988, function() {
    console.log('Medic API listening on port 5988');
  });
});
