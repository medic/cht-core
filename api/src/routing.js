const _ = require('underscore'),
      bodyParser = require('body-parser'),
      express = require('express'),
      morgan = require('morgan'),
      db = require('./db-nano'),
      path = require('path'),
      auth = require('./auth'),
      isClientHuman = require('./is-client-human'),
      AuditProxy = require('./audit-proxy'),
      target = 'http://' + db.settings.host + ':' + db.settings.port,
      proxy = require('http-proxy').createProxyServer({ target: target }),
      proxyForAuditing = require('http-proxy').createProxyServer({ target: target }),
      login = require('./controllers/login'),
      smsGateway = require('./controllers/sms-gateway'),
      exportData = require('./controllers/export-data'),
      records = require('./controllers/records'),
      forms = require('./controllers/forms'),
      users = require('./controllers/users'),
      places = require('./controllers/places'),
      people = require('./controllers/people'),
      upgrade = require('./controllers/upgrade'),
      settings = require('./controllers/settings'),
      bulkDocs = require('./controllers/bulk-docs'),
      createUserDb = require('./controllers/create-user-db'),
      createDomain = require('domain').create,
      staticResources = /\/(templates|static)\//,
      favicon = /\/icon_\d+.ico$/,
      pathPrefix = '/' + db.settings.db + '/',
      appPrefix = pathPrefix + '_design/' + db.settings.ddoc + '/_rewrite/',
      serverUtils = require('./server-utils'),
      appcacheManifest = /\/manifest\.appcache$/,
      app = express();

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

// When testing random stuff in-browser, it can be useful to access the database
// from different domains (e.g. localhost:5988 vs localhost:8080).  Adding the
// --allow-cors commandline switch will enable this from within a web browser.
if(process.argv.slice(2).includes('--allow-cors')) {
  console.log('WARNING: allowing CORS requests to API!');
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || req.headers.host);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, HEAD, DELETE');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
  });
}

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


// TODO: investigate blocking writes to _users from the outside. Reads maybe as well, though may be harder
//       https://github.com/medic/medic-webapp/issues/4089

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
app.get(pathPrefix + 'login/identity', login.getIdentity);
app.postJson(pathPrefix + 'login', login.post);

var UNAUDITED_ENDPOINTS = [
  // This takes arbitrary JSON, not whole documents with `_id`s, so it's not
  // auditable in our current framework
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
  var p = require('../package.json');
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
  var p = require('../package.json');
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

app.post('/api/v1/upgrade', jsonParser, upgrade.upgrade);
app.post('/api/v1/upgrade/stage', jsonParser, upgrade.stage);
app.post('/api/v1/upgrade/complete', jsonParser, upgrade.complete);

app.get('/api/sms/', function(req, res) {
  res.redirect(301, '/api/sms');
});
app.get('/api/sms', function(req, res) {
  auth.check(req, 'can_access_gateway_api', null, function(err) {
    if (err) {
      return serverUtils.error(err, req, res);
    }
    res.json(smsGateway.get());
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
    smsGateway.post(req)
      .then(results => {
        res.json(results);
      })
      .catch(err => {
        serverUtils.error(err, req, res);
      });
  });
});

app.all('/api/v1/export/:type/:form?', exportData.routeV1);
app.all(`/${db.getPath()}/export/:type/:form?`, exportData.routeV1);
app.get('/api/v2/export/:type', exportData.routeV2);
app.postJson('/api/v2/export/:type', exportData.routeV2);

app.post('/api/v1/records', [jsonParser, formParser], records.v1);
app.post('/api/v2/records', [jsonParser, formParser], records.v2);

app.get('/api/v1/forms', function(req, res) {
  forms.listForms(req.headers, function(err, body, headers) {
    if (err) {
      return serverUtils.error(err, req, res);
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

const emptyJSONBodyError = function(req, res) {
  return serverUtils.error({
    code: 400,
    message: 'Request body is empty or Content-Type header was not set to application/json.'
  }, req, res);
};
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

app.postJson('/api/v1/bulk-delete', bulkDocs.bulkDelete);

app.get(`${appPrefix}app_settings/${db.settings.ddoc}/:path?`, settings.getV0); // deprecated
app.get('/api/v1/settings', settings.get);

app.putJson(`${appPrefix}update_settings/${db.settings.ddoc}`, settings.put); // deprecated
app.putJson('/api/v1/settings', settings.put);

// DB replication endpoint
const changesHandler = _.partial(require('./controllers/changes').request, proxy);
app.get(pathPrefix + '_changes', changesHandler);
app.postJson(pathPrefix + '_changes', changesHandler);

const metaPathPrefix = '/medic-user-\*-meta/';

// AuthZ for this endpoint should be handled by couchdb
app.get(metaPathPrefix + '_changes', (req, res) => {
  if (req.query.feed === 'longpoll' ||
      req.query.feed === 'continuous' ||
      req.query.feed === 'eventsource') {
    // Disable nginx proxy buffering to allow hearbeats for long-running feeds
    // Issue: #4312
    res.setHeader('X-Accel-Buffering', 'no');
  }
  proxy.web(req, res);
});

// Attempting to create the user's personal meta db
app.put(metaPathPrefix, createUserDb);

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

  if(req.body) {
    let bodyData = JSON.stringify(req.body);
    // incase if content-type is application/x-www-form-urlencoded -> we need to change to application/json
    proxyReq.setHeader('Content-Type','application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    // stream the content
    proxyReq.write(bodyData);
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
  var urlSansTrailingSlash = url.slice(0, -1);
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

module.exports = app;
