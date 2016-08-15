var utils = require('kujua-utils');

(function () {

  'use strict';

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
    } catch(e) {
      return;
    }
  };

  var getDbInfo = function(username) {
    // parse the URL to determine the remote and local database names
    var url = window.location.href;
    var protocolLocation = url.indexOf('//') + 2;
    var hostLocation = url.indexOf('/', protocolLocation) + 1;
    var dbNameLocation = url.indexOf('/', hostLocation);
    var dbName = url.slice(hostLocation, dbNameLocation);
    return {
      name: dbName,
      local: dbName + '-user-' + username,
      remote: url.slice(0, dbNameLocation)
    };
  };

  var initialReplication = function(localDb, remoteDb, username) {
    var dbSyncStartTime = Date.now();
    var dbSyncStartData = getDataUsage();
    return localDb.replicate.from(remoteDb, {
      live: false,
      retry: false,
      heartbeat: 10000,
      doc_ids: [ 'org.couchdb.user:' + username ]
    })
      .then(function() {
        var duration = Date.now() - dbSyncStartTime;
        console.info('Initial sync completed successfully in ' + (duration / 1000) + ' seconds');
        if (dbSyncStartData) {
          var dbSyncEndData = getDataUsage();
          var rx = dbSyncEndData.app.rx - dbSyncStartData.app.rx;
          console.info('Initial sync received ' + rx + 'B of data');
        }
      });
  };

  var getDataUsage = function() {
    if (window.medicmobile_android && window.medicmobile_android.getDataUsage) {
      return JSON.parse(window.medicmobile_android.getDataUsage());
    }
  };

  module.exports = function(callback) {
    var userCtx = getUserCtx();
    if (utils.isUserAdmin(userCtx)) {
      return callback();
    }

    var username = userCtx && userCtx.name;
    var dbInfo = getDbInfo(username);

    var localDb = window.PouchDB(dbInfo.local, {
      auto_compaction: true
    });

    localDb
      .get('_design/medic-client')
      .then(function() {
        // ddoc found - bootstrap immediately
        callback();
      })
      .catch(function() {
        // no ddoc found - do replication

        var remoteDb = window.PouchDB(dbInfo.remote, {
          skip_setup: true,
          ajax: { timeout: 30000 }
        });
        initialReplication(localDb, remoteDb, username)
          .then(function() {
            // replication complete - bootstrap angular
            callback();
          })
          .catch(function(err) {
            if (err.status === 401) {
              console.warn('User must reauthenticate');
              err.redirect = '/' + dbInfo.name + '/login?redirect=' +
                encodeURIComponent(window.location.href);
            }
            callback(err);
          });
      });

  };
}());
