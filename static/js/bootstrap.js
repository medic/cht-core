var _ = require('underscore'),
    utils = require('kujua-utils');

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
    var remoteDbOptions = {
      skip_setup: true,
      ajax: { timeout: 30000 }
    };
    return {
      name: dbName,
      local: window.PouchDB(dbName + '-user-' + username),
      remote: window.PouchDB(url.slice(0, dbNameLocation), remoteDbOptions)
    };
  };

  var initialReplication = function(db, username) {
    if (utils.isUserAdmin(getUserCtx())) {
      return window.PouchDB.utils.Promise.resolve();
    }
    var dbSyncStartTime = Date.now();
    var dbSyncStartData = getDataUsage();
    return db.local.replicate.from(db.remote, {
      live: false,
      retry: false,
      heartbeat: 10000,
      doc_ids: [ 'org.couchdb.user:' + username ]
    })
      .then(function(info) {
        console.log('Initial sync completed successfully', info);
      })
      .catch(function(err) {
        console.error('Initial sync failed - continuing anyway', err);
      })
      .then(function() {
        var duration = Date.now() - dbSyncStartTime;
        console.info('Initial sync finished in ' + (duration / 1000) + ' seconds')
        if (dbSyncStartData) {
          var dbSyncEndData = getDataUsage();
          var rx = dbSyncEndData.app.rx - dbSyncStartData.app.rx;
          console.info('Initial sync received ' + rx + 'B of data');
        }
      })
  };

  var replicateDdoc = function(db) {
    return db.remote
      .get('_design/medic')
      .then(function(ddoc) {
        var minimal = _.pick(ddoc, '_id', 'app_settings', 'views');
        minimal.remote_rev = ddoc._rev;
        return db.local.put(minimal);
      });
  };

  var getDataUsage = function() {
    if (window.medicmobile_android && window.medicmobile_android.getDataUsage) {
      return JSON.parse(window.medicmobile_android.getDataUsage());
    }
  };

  module.exports = function(callback) {

    var userCtx = getUserCtx();
    var username = userCtx && userCtx.name;
    var db = getDbInfo(username);

    db.local
      .get('_design/medic')
      .then(function() {
        // ddoc found - bootstrap immediately
        callback();
      })
      .catch(function() {
        // no ddoc found - do replication
        initialReplication(db, username)
          .then(function() {
            return replicateDdoc(db);
          })
          .then(function() {
            console.log('Local DDOC stored - starting app');
            // replication complete - bootstrap angular
            callback();
          })
          .catch(function(err) {
            if (err.status === 401) {
              console.warn('User must reauthenticate');
              window.location.href = '/' + db.name + '/login' +
              '?redirect=' + encodeURIComponent(window.location.href);
            } else {
              $('.bootstrap-layer').html('<div><p>Loading error, please check your connection.</p><a class="btn btn-primary" href="#" onclick="window.location.reload(false);">Try again</a></div>');
              console.error('Error fetching ddoc from remote server', err);
            }
          });
      });

  };
}());