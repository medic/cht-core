const login = require('./controllers/login'),
      db = require('./db');

const target = 'http://' + db.settings.host + ':' + db.settings.port,
      proxy = require('http-proxy').createProxyServer({ target: target }),
      proxyForAuditing = require('http-proxy').createProxyServer({ target: target });

const AuditProxy = require('./audit-proxy'),
      isClientHuman = require('./is-client-human'),
      serverUtils = require('./server-utils');

const appcacheManifest = /\/manifest\.appcache$/,
      favicon = /\/icon_\d+.ico$/,
      staticResources = /\/(templates|static)\//;
/**
 * Manages the raw proxy between API and CouchDB
 *
 * @return     {<type>}  { description_of_the_return_value }
 */
module.exports = {
  setupProxy: (app, {pathPrefix}) => {
    const appPrefix = pathPrefix + '_design/' + db.settings.ddoc + '/_rewrite/';

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
  };
}
};
