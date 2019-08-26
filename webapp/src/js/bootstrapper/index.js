(function () {

  'use strict';

  const purger = require('./purger');
  const registerServiceWorker = require('./swRegister');
  const translator = require('./translator');

  const ONLINE_ROLE = 'mm-online';

  let remoteDocCount;
  let localDocCount;

  var getUserCtx = function() {
    var userCtx, locale;
    document.cookie.split(';').forEach(function(c) {
      c = c.trim().split('=', 2);
      if (c[0] === 'userCtx') {
        userCtx = c[1];
      }
      if (c[0] === 'locale') {
        locale = c[1];
      }
    });
    if (!userCtx) {
      return;
    }
    try {
      var parsedCtx = JSON.parse(unescape(decodeURI(userCtx)));
      parsedCtx.locale = locale;
      return parsedCtx;
    } catch (e) {
      return;
    }
  };

  const getBaseUrl = () => {
    // parse the URL to determine the remote and local database names
    const location = window.location;
    const port = location.port ? ':' + location.port : '';
    return `${location.protocol}//${location.hostname}${port}`;
  };

  const getDbInfo = function() {
    const dbName = 'medic';
    return {
      name: dbName,
      remote: `${getBaseUrl()}/${dbName}`
    };
  };

  var getLocalDbName = function(dbInfo, username) {
    return dbInfo.name + '-user-' + username;
  };

  const docCountPoll = (localDb) => {
    setUiStatus('POLL_REPLICATION');
    return Promise
      .all([
        localDb.allDocs({ limit: 1 }),
        window.PouchDB.fetch(`${getBaseUrl()}/api/v1/users-info`).then(res => res.json())
      ])
      .then(([ local, remote ]) => {
        localDocCount = local.total_rows;
        remoteDocCount = remote.total_docs;

        if (remote.warn) {
          return new Promise(resolve => {
            const errorMessage = translator.translate('TOO_MANY_DOCS', { count: remoteDocCount, limit: remote.limit });
            const continueBtn = translator.translate('CONTINUE');
            const abort = translator.translate('ABORT');

            $('.bootstrap-layer .loader, .bootstrap-layer .status').hide();
            $('.bootstrap-layer .error').show();
            $('.bootstrap-layer .error').html('<div><p>' + errorMessage + '</p><a id="btn-continue" class="btn btn-primary pull-left" href="#">' + continueBtn + '</a><a id="btn-abort" class="btn btn-danger pull-right" href="#">' + abort + '</a></div>');
            $('#btn-continue').click(() => resolve());
            $('#btn-abort').click(() => {
              document.cookie = 'login=force;path=/';
              window.location.reload(false);
            });
          });
        }
      });
  };

  var initialReplication = function(localDb, remoteDb) {
    setUiStatus('LOAD_APP');
    var dbSyncStartTime = Date.now();
    var dbSyncStartData = getDataUsage();
    var replicator = localDb.replicate
      .from(remoteDb, {
        live: false,
        retry: false,
        heartbeat: 10000,
        timeout: 1000 * 60 * 10, // try for ten minutes then give up,
        query_params: { initial_replication: true }
      });

    replicator
      .on('change', function(info) {
        console.log('initialReplication()', 'change', info);
        setUiStatus('FETCH_INFO', { count: info.docs_read + localDocCount || '?', total: remoteDocCount });
      });

    return replicator
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
    return hasRole(userCtx, '_admin') ||
           hasRole(userCtx, 'national_admin') || // kept for backwards compatibility
           hasRole(userCtx, ONLINE_ROLE);
  };

  const setUiStatus = (translationKey, args)  => {
    const translated = translator.translate(translationKey, args);
    $('.bootstrap-layer .status, .bootstrap-layer .loader').show();
    $('.bootstrap-layer .error').hide();
    $('.bootstrap-layer .status').text(translated);
  };

  const setUiError = err => {
    const errorMessage = translator.translate(err && err.key || 'ERROR_MESSAGE');
    const tryAgain = translator.translate('TRY_AGAIN');
    $('.bootstrap-layer .error').html('<div><p>' + errorMessage + '</p><a id="btn-reload" class="btn btn-primary" href="#">' + tryAgain + '</a></div>');
    $('#btn-reload').click(() => window.location.reload(false));
    $('.bootstrap-layer .loader, .bootstrap-layer .status').hide();
    $('.bootstrap-layer .error').show();
  };

  var getDdoc = function(localDb) {
    return localDb.get('_design/medic-client');
  };

  module.exports = function(POUCHDB_OPTIONS, callback) {
    var dbInfo = getDbInfo();
    var userCtx = getUserCtx();
    const hasForceLoginCookie = document.cookie.includes('login=force');
    if (!userCtx || hasForceLoginCookie) {
      var err = new Error('User must reauthenticate');
      err.status = 401;
      return redirectToLogin(dbInfo, err, callback);
    }

    if (hasFullDataAccess(userCtx)) {
      return callback();
    }

    translator.setLocale(userCtx.locale);

    const onServiceWorkerInstalling = () => setUiStatus('DOWNLOAD_APP');
    const swRegistration = registerServiceWorker(onServiceWorkerInstalling);

    const localDbName = getLocalDbName(dbInfo, userCtx.name);
    const localDb = window.PouchDB(localDbName, POUCHDB_OPTIONS.local);
    const remoteDb = window.PouchDB(dbInfo.remote, POUCHDB_OPTIONS.remote);

    const testReplicationNeeded = () => getDdoc(localDb).then(() => false).catch(() => true);

    let isInitialReplicationNeeded;
    Promise.all([swRegistration, testReplicationNeeded()])
      .then(function(resolved) {
        isInitialReplicationNeeded = !!resolved[1];

        if (isInitialReplicationNeeded) {
          return docCountPoll(localDb)
            .then(() => initialReplication(localDb, remoteDb))
            .then(testReplicationNeeded)
            .then(isReplicationStillNeeded => {
              if (isReplicationStillNeeded) {
                throw new Error('Initial replication failed');
              }
            });
        }
      })
      .then(() => purger(localDb, userCtx, isInitialReplicationNeeded)
        .on('start', () => setUiStatus('PURGE_INIT'))
        .on('progress', function(progress) {
          setUiStatus('PURGE_INFO', {
            count: progress.purged,
            percent: Math.floor((progress.processed / progress.total) * 100)
          });
        })
        .on('optimise', () => setUiStatus('PURGE_AFTER'))
        .catch(console.error)
      )
      .then(() => setUiStatus('STARTING_APP'))
      .catch(err => err)
      .then(function(err) {
        localDb.close();
        remoteDb.close();
        if (err) {
          if (err.status === 401) {
            return redirectToLogin(dbInfo, err, callback);
          }

          setUiError(err);
        }

        callback(err);
      });

  };

}());
