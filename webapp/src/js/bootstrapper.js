(function() {
  'use strict';

  var ONLINE_ROLE = 'mm-online';

  var getUserCtx = function() {
    var userCtx;
    document.cookie.split(';').forEach(function(c) {
      c = c.trim().split('=', 2);
      if (c[0] === 'userCtx') {
        userCtx = c[1];
      }
    });
    if (!userCtx) {
      return;
    }
    try {
      return JSON.parse(unescape(decodeURI(userCtx)));
    } catch (e) {
      return;
    }
  };

  var getDbInfo = function() {
    // parse the URL to determine the remote and local database names
    var url = window.location.href;
    var protocolLocation = url.indexOf('//') + 2;
    var hostLocation = url.indexOf('/', protocolLocation) + 1;
    var dbNameLocation = url.indexOf('/', hostLocation);
    var dbName = url.slice(hostLocation, dbNameLocation);
    return {
      name: dbName,
      remote: url.slice(0, dbNameLocation),
    };
  };

  var getLocalDbName = function(dbInfo, username) {
    return dbInfo.name + '-user-' + username;
  };

  var initialReplication = function(localDb, remoteDb) {
    $('.bootstrap-layer .status').text('Loading app…');
    var dbSyncStartTime = Date.now();
    var dbSyncStartData = getDataUsage();
    var replicator = localDb.replicate.from(remoteDb, {
      live: false,
      retry: false,
      heartbeat: 10000,
      timeout: 1000 * 60 * 10, // try for ten minutes then give up
    });

    replicator.on('change', function(info) {
      console.log('initialReplication()', 'change', info);
      $('.bootstrap-layer .status').text('Fetching info (' + info.docs_read + ' docs)…');
    });

    return replicator.then(function() {
      var duration = Date.now() - dbSyncStartTime;
      console.info('Initial sync completed successfully in ' + duration / 1000 + ' seconds');
      if (dbSyncStartData) {
        var dbSyncEndData = getDataUsage();
        var rx = dbSyncEndData.app.rx - dbSyncStartData.app.rx;
        console.info('Initial sync received ' + rx + 'B of data');
      }
    });
  };

  var getDataUsage = function() {
    if (window.medicmobile_android && typeof window.medicmobile_android.getDataUsage === 'function') {
      return JSON.parse(window.medicmobile_android.getDataUsage());
    }
  };

  var redirectToLogin = function(dbInfo, err, callback) {
    console.warn('User must reauthenticate');
    var currentUrl = encodeURIComponent(window.location.href);
    err.redirect = '/' + dbInfo.name + '/login?redirect=' + currentUrl;
    return callback(err);
  };

  // TODO Use a shared library for this duplicated code #4021
  var hasRole = function(userCtx, role) {
    if (userCtx.roles) {
      for (var i = 0; i < userCtx.roles.length; i++) {
        if (userCtx.roles[i] === role) {
          return true;
        }
      }
    }
    return false;
  };

  var hasFullDataAccess = function(userCtx) {
    return (
      hasRole(userCtx, '_admin') ||
      hasRole(userCtx, 'national_admin') || // kept for backwards compatibility
      hasRole(userCtx, ONLINE_ROLE)
    );
  };

  var getDdoc = function(localDb) {
    return localDb.get('_design/medic-client');
  };

  module.exports = function(POUCHDB_OPTIONS, callback) {
    var dbInfo = getDbInfo();
    var userCtx = getUserCtx();
    if (!userCtx) {
      var err = new Error('User must reauthenticate');
      err.status = 401;
      return redirectToLogin(dbInfo, err, callback);
    }
    if (hasFullDataAccess(userCtx)) {
      return callback();
    }

    var username = userCtx && userCtx.name;
    var localDbName = getLocalDbName(dbInfo, username);
    var localDb = window.PouchDB(localDbName, POUCHDB_OPTIONS.local);

    getDdoc(localDb)
      .then(function() {
        // ddoc found - bootstrap immediately
        localDb.close();
        callback();
      })
      .catch(function() {
        // no ddoc found - do replication

        var remoteDb = window.PouchDB(dbInfo.remote, POUCHDB_OPTIONS.remote);
        initialReplication(localDb, remoteDb)
          .then(function() {
            return getDdoc(localDb).catch(function() {
              throw new Error('Initial replication failed');
            });
          })
          .then(function() {
            // replication complete - bootstrap angular
            $('.bootstrap-layer .status').text('Starting app…');
          })
          .catch(function(err) {
            return err;
          })
          .then(function(err) {
            localDb.close();
            remoteDb.close();
            if (err && err.status === 401) {
              return redirectToLogin(dbInfo, err, callback);
            }
            callback(err);
          });
      });
  };
})();
