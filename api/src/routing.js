const _ = require('underscore'),
  bodyParser = require('body-parser'),
  express = require('express'),
  morgan = require('morgan'),
  helmet = require('helmet'),
  db = require('./db-nano'),
  path = require('path'),
  auth = require('./auth'),
  logger = require('./logger'),
  isClientHuman = require('./is-client-human'),
  target = 'http://' + db.settings.host + ':' + db.settings.port,
  proxy = require('http-proxy').createProxyServer({ target: target }),
  proxyForAuth = require('http-proxy').createProxyServer({
    target: target,
    selfHandleResponse: true,
  }),
  proxyForChanges = require('http-proxy').createProxyServer({
    target: target,
    selfHandleResponse: true,
  }),
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
  authorization = require('./middleware/authorization'),
  createUserDb = require('./controllers/create-user-db'),
  staticResources = /\/(templates|static)\//,
  favicon = /\/icon_\d+.ico$/,
  // CouchDB is very relaxed in matching routes
  routePrefix = '/+' + db.settings.db + '/+',
  pathPrefix = '/' + db.settings.db + '/',
  appPrefix = pathPrefix + '_design/' + db.settings.ddoc + '/_rewrite/',
  serverUtils = require('./server-utils'),
  appcacheManifest = /\/manifest\.appcache$/,
  uuid = require('uuid/v4'),
  compression = require('compression'),
  app = express();

// requires content-type application/json header
var jsonParser = bodyParser.json({ limit: '32mb' });

const handleJsonRequest = (method, path, callback) => {
  app[method](path, jsonParser, (req, res, next) => {
    const contentType = req.headers['content-type'];
    if (!contentType || contentType !== 'application/json') {
      return serverUtils.error(
        {
          code: 400,
          message: 'Content-Type must be application/json',
        },
        req,
        res
      );
    } else {
      callback(req, res, next);
    }
  });
};
app.deleteJson = (path, callback) =>
  handleJsonRequest('delete', path, callback);
app.postJson = (path, callback) => handleJsonRequest('post', path, callback);
app.putJson = (path, callback) => handleJsonRequest('put', path, callback);

// requires content-type application/x-www-form-urlencoded header
var formParser = bodyParser.urlencoded({ limit: '32mb', extended: false });

app.set('strict routing', true);

// When testing random stuff in-browser, it can be useful to access the database
// from different domains (e.g. localhost:5988 vs localhost:8080).  Adding the
// --allow-cors commandline switch will enable this from within a web browser.
if (process.argv.slice(2).includes('--allow-cors')) {
  logger.warn('WARNING: allowing CORS requests to API!');
  app.use((req, res, next) => {
    res.setHeader(
      'Access-Control-Allow-Origin',
      req.headers.origin || req.headers.host
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, OPTIONS, HEAD, DELETE'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    next();
  });
}

app.use((req, res, next) => {
  req.id = uuid.v4();
  next();
});
morgan.token('id', req => req.id);
app.use(
  morgan('REQ :id :remote-addr :remote-user :method :url HTTP/:http-version', {
    immediate: true,
  })
);
app.use(
  morgan(
    'RES :id :remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] :response-time ms'
  )
);

app.use(
  helmet({
    // runs with a bunch of defaults: https://github.com/helmetjs/helmet
    hpkp: false, // explicitly block dangerous header
    contentSecurityPolicy: {
      directives: {
        frameSrc: ['\'self\''] // prettier-ignore
      },
    },
  })
);

// requires `req` header `Accept-Encoding` to be `gzip` or `deflate`
// requires `res` `Content-Type` to be compressible (see https://github.com/jshttp/mime-db/blob/master/db.json)
// default threshold is 1KB
app.use(compression());

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
app.get(routePrefix + 'login', login.get);
app.get(routePrefix + 'login/identity', login.getIdentity);
app.postJson(routePrefix + 'login', login.post);

// saves CouchDB _session information as `userCtx` in the `req` object
app.use(authorization.getUserCtx);

// authorization for `_compact`, `_view_cleanup`, `_revs_limit` endpoints is handled by CouchDB
const ONLINE_ONLY_ENDPOINTS = [
  '_design/*/_list/*',
  '_design/*/_show/*',
  '_design/*/_view/*',
  '_find(/*)?',
  '_explain(/*)?',
  '_index(/*)?',
  '_ensure_full_commit(/*)?',
  '_security(/*)?',
  '_purge(/*)?',
];

// block offline users from accessing some unaudited CouchDB endpoints
ONLINE_ONLY_ENDPOINTS.forEach(url =>
  app.all(routePrefix + url, authorization.offlineUserFirewall)
);

var UNAUDITED_ENDPOINTS = [
  // This takes arbitrary JSON, not whole documents with `_id`s, so it's not
  // auditable in our current framework
  // Replication machinery we don't care to audit
  routePrefix + '_local/*',
  routePrefix + '_revs_diff',
  routePrefix + '_missing_revs',
  // NB: _changes, _all_docs, _bulk_get are dealt with elsewhere:
  // see `changesHandler`, `allDocsHandler`, `bulkGetHandler`
  routePrefix + '_design/*/_list/*',
  routePrefix + '_design/*/_show/*',
  routePrefix + '_design/*/_view/*',
  // Interacting with mongo filters uses POST
  routePrefix + '_find',
  routePrefix + '_explain',
  // allow anyone to access their _session information
  '/_session',
];

UNAUDITED_ENDPOINTS.forEach(function(url) {
  // NB: as this evaluates first, it will skip any hooks defined in the rest of
  // the file below, and these calls will all be proxies. If you want to avoid
  // auditing and do other things as well, look to how the _changes feed is
  // handled.
  app.all(url, function(req, res) {
    proxy.web(req, res);
  });
});

app.get('/setup/poll', function(req, res) {
  var p = require('../package.json');
  res.json({
    ready: true,
    handler: 'medic-api',
    version: p.version,
    detail: 'All required services are running normally',
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
  auth
    .check(req, 'can_access_gateway_api')
    .then(() => res.json(smsGateway.get()))
    .catch(err => serverUtils.error(err, req, res));
});

app.post('/api/sms/', function(req, res) {
  res.redirect(301, '/api/sms');
});
app.postJson('/api/sms', function(req, res) {
  auth
    .check(req, 'can_access_gateway_api')
    .then(() => smsGateway.post(req))
    .then(results => res.json(results))
    .catch(err => serverUtils.error(err, req, res));
});

app.all('/api/v1/export/:type/:form?', exportData.routeV1);
app.all(`/${db.getPath()}/export/:type/:form?`, exportData.routeV1);
app.get('/api/v2/export/:type', exportData.routeV2);
app.postJson('/api/v2/export/:type', exportData.routeV2);

app.post('/api/v1/records', [jsonParser, formParser], records.v1);
app.post('/api/v2/records', [jsonParser, formParser], records.v2);

app.get('/api/v1/forms/', (req, res) => {
  res.redirect(301, '/api/v1/forms');
});
app.get('/api/v1/forms', forms.list);
app.get('/api/v1/forms/:form', forms.get);

app.get('/api/v1/users', users.get);
app.postJson('/api/v1/users', users.create);
app.postJson('/api/v1/users/:username', users.update);
app.delete('/api/v1/users/:username', users.delete);

app.postJson('/api/v1/places', function(req, res) {
  auth
    .check(req, 'can_create_places')
    .then(() => {
      if (_.isEmpty(req.body)) {
        return serverUtils.emptyJSONBodyError(req, res);
      }
      return places.createPlace(req.body).then(body => res.json(body));
    })
    .catch(err => serverUtils.error(err, req, res));
});

app.postJson('/api/v1/places/:id', function(req, res) {
  auth
    .check(req, 'can_update_places')
    .then(() => {
      if (_.isEmpty(req.body)) {
        return serverUtils.emptyJSONBodyError(req, res);
      }
      return places
        .updatePlace(req.params.id, req.body)
        .then(body => res.json(body));
    })
    .catch(err => serverUtils.error(err, req, res));
});

app.postJson('/api/v1/people', function(req, res) {
  auth
    .check(req, 'can_create_people')
    .then(() => {
      if (_.isEmpty(req.body)) {
        return serverUtils.emptyJSONBodyError(req, res);
      }
      return people.createPerson(req.body).then(body => res.json(body));
    })
    .catch(err => serverUtils.error(err, req, res));
});

app.postJson('/api/v1/bulk-delete', bulkDocs.bulkDelete);

app.get(`${appPrefix}app_settings/${db.settings.ddoc}/:path?`, settings.getV0); // deprecated
app.get('/api/v1/settings', settings.get);

app.putJson(`${appPrefix}update_settings/${db.settings.ddoc}`, settings.put); // deprecated
app.putJson('/api/v1/settings', settings.put);

// authorization middleware to proxy online users requests directly to CouchDB
// reads offline users `user-settings` and saves it as `req.userCtx`
const onlineUserProxy = _.partial(authorization.onlineUserProxy, proxy),
  onlineUserChangesProxy = _.partial(
    authorization.onlineUserProxy,
    proxyForChanges
  );

// DB replication endpoint
const changesHandler = require('./controllers/changes').request,
  changesPath = routePrefix + '_changes(/*)?';

app.get(
  changesPath,
  authorization.checkAuth,
  onlineUserChangesProxy,
  changesHandler
);
app.post(
  changesPath,
  authorization.checkAuth,
  onlineUserChangesProxy,
  jsonParser,
  changesHandler
);

// filter _all_docs requests for offline users
const allDocsHandler = require('./controllers/all-docs').request,
  allDocsPath = routePrefix + '_all_docs(/*)?';

app.get(allDocsPath, authorization.checkAuth, onlineUserProxy, allDocsHandler);
app.post(
  allDocsPath,
  authorization.checkAuth,
  onlineUserProxy,
  jsonParser,
  allDocsHandler
);

// filter _bulk_get requests for offline users
const bulkGetHandler = require('./controllers/bulk-get').request;
app.post(
  routePrefix + '_bulk_get(/*)?',
  authorization.checkAuth,
  onlineUserProxy,
  jsonParser,
  bulkGetHandler
);

// filter _bulk_docs requests for offline users
// this is an audited endpoint: online and filtered offline requests will pass through to the audit route
app.post(
  routePrefix + '_bulk_docs(/*)?',
  authorization.checkAuth,
  authorization.onlineUserPassThrough, // online user requests pass through to the next route
  jsonParser,
  bulkDocs.request,
  authorization.setAuthorized // adds the `authorized` flag to the `req` object, so it passes the firewall
);

// filter db-doc and attachment requests for offline users
// these are audited endpoints: online and allowed offline requests will pass through to the audit route
const dbDocHandler = require('./controllers/db-doc'),
  docPath = routePrefix + ':docId/{0,}',
  attachmentPath = routePrefix + ':docId/+:attachmentId*',
  ddocPath = routePrefix + '_design/+:ddocId*';

app.get(
  ddocPath,
  authorization.checkAuth,
  onlineUserProxy,
  _.partial(dbDocHandler.requestDdoc, db.settings.ddoc),
  authorization.setAuthorized // adds the `authorized` flag to the `req` object, so it passes the firewall
);

app.get(
  docPath,
  authorization.checkAuth,
  onlineUserProxy, // online user GET requests are proxied directly to CouchDB
  dbDocHandler.request
);
app.post(
  routePrefix,
  authorization.checkAuth,
  authorization.onlineUserPassThrough, // online user requests pass through to the next route
  jsonParser, // request body must be json
  dbDocHandler.request,
  authorization.setAuthorized // adds the `authorized` flag to the `req` object, so it passes the firewall
);
app.put(
  docPath,
  authorization.checkAuth,
  authorization.onlineUserPassThrough, // online user requests pass through to the next route,
  jsonParser,
  dbDocHandler.request,
  authorization.setAuthorized // adds the `authorized` flag to the `req` object, so it passes the firewall
);
app.delete(
  docPath,
  authorization.checkAuth,
  authorization.onlineUserPassThrough, // online user requests pass through to the next route,
  dbDocHandler.request,
  authorization.setAuthorized // adds the `authorized` flag to the `req` object, so it passes the firewall
);
app.all(
  attachmentPath,
  authorization.checkAuth,
  authorization.onlineUserPassThrough, // online user requests pass through to the next route
  dbDocHandler.request,
  authorization.setAuthorized // adds the `authorized` flag to the `req` object, so it passes the firewall
);

const metaPathPrefix = '/medic-user-*-meta/';

// AuthZ for this endpoint should be handled by couchdb
app.get(metaPathPrefix + '_changes', (req, res) => {
  proxyForChanges.web(req, res);
});

// Attempting to create the user's personal meta db
app.put(metaPathPrefix, createUserDb);
// AuthZ for this endpoint should be handled by couchdb, allow offline users to access this directly
app.all(metaPathPrefix + '*', authorization.setAuthorized);

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

// allow POST requests which have been body-parsed to be correctly proxied
const writeParsedBody = (proxyReq, req) => {
  if (req.body) {
    let bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
};

const copyProxyHeaders = (proxyRes, res) => {
  if (!res.headersSent) {
    res.statusCode = proxyRes.statusCode;
    if (proxyRes.statusMessage) {
      res.statusMessage = proxyRes.statusMessage;
    }

    _.each(proxyRes.headers, (value, key) => {
      if (value !== undefined) {
        res.setHeader(String(key).trim(), value);
      }
    });
  }
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
    writeHeaders(req, res, [['Cache-Control', 'public, max-age=604800']]);
  } else if (appcacheManifest.test(req.url)) {
    // requesting the appcache manifest
    writeHeaders(req, res, [
      ['Cache-Control', 'must-revalidate'],
      ['Content-Type', 'text/cache-manifest; charset=utf-8'],
      ['Last-Modified', 'Tue, 28 Apr 2015 02:23:40 GMT'],
      ['Expires', 'Tue, 28 Apr 2015 02:21:40 GMT'],
    ]);
  } else if (
    !staticResources.test(req.url) &&
    req.url.indexOf(appPrefix) !== -1
  ) {
    // requesting other application files
    writeHeaders(req, res, [], true);
  } else {
    // everything else
    writeHeaders(req, res);
  }

  writeParsedBody(proxyReq, req);
});

proxyForChanges.on('proxyReq', (proxyReq, req) => {
  writeParsedBody(proxyReq, req);
});

// because these are longpolls, we need to manually flush the CouchDB heartbeats through compression
proxyForChanges.on('proxyRes', (proxyRes, req, res) => {
  copyProxyHeaders(proxyRes, res);

  proxyRes.pipe(res);
  proxyRes.on('data', () => res.flush());
});

/**
 * Make sure requests to these urls sans trailing / are redirected to the
 * correct slashed endpoint to avoid weird bugs
 */
[appPrefix, pathPrefix].forEach(function(url) {
  var urlSansTrailingSlash = url.slice(0, -1);
  app.get(urlSansTrailingSlash, function(req, res) {
    res.redirect(url);
  });
});

// allow offline users to access the app
app.all(appPrefix + '*', authorization.setAuthorized);

// block offline users requests from accessing CouchDB directly, via Proxy
// requests which are authorized (fe: by BulkDocsHandler or DbDocHandler) can pass through
// unauthenticated requests will be redirected to login or given a meaningful error
app.use(authorization.offlineUserFirewall);

var canEdit = function(req, res) {
  auth
    .check(req, 'can_edit')
    .then(ctx => {
      if (!ctx || !ctx.user) {
        serverUtils.serverError('not-authorized', req, res);
        return;
      }
      proxyForAuth.web(req, res);
    })
    .catch(() => {
      serverUtils.serverError('not-authorized', req, res);
    });
};

var editPath = routePrefix + '*';
app.put(editPath, canEdit);
app.post(editPath, canEdit);
app.delete(editPath, canEdit);

app.all('*', function(req, res) {
  proxy.web(req, res);
});

proxy.on('error', function(err, req, res) {
  serverUtils.serverError(JSON.stringify(err), req, res);
});

proxyForAuth.on('error', function(err, req, res) {
  serverUtils.serverError(JSON.stringify(err), req, res);
});

proxyForChanges.on('error', (err, req, res) => {
  serverUtils.serverError(JSON.stringify(err), req, res);
});

proxyForAuth.on('proxyReq', function(proxyReq, req) {
  writeParsedBody(proxyReq, req);
});

// intercept responses from filtered offline endpoints to fill in with forbidden docs stubs
proxyForAuth.on('proxyRes', (proxyRes, req, res) => {
  copyProxyHeaders(proxyRes, res);

  if (res.interceptResponse) {
    let body = new Buffer('');
    proxyRes.on('data', data => (body = Buffer.concat([body, data])));
    proxyRes.on('end', () => res.interceptResponse(req, res, body.toString()));
  } else {
    proxyRes.pipe(res);
  }
});

module.exports = app;
