(function () {

  'use strict';

  const registerServiceWorker = require('./swRegister');
  const translator = require('./translator');
  const utils = require('./utils');
  const purger = require('./purger');
  const initialReplicationLib = require('./initial-replication');

  const ONLINE_ROLE = 'mm-online';

  const getUserCtx = function() {
    let userCtx;
    let locale;
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
      const parsedCtx = JSON.parse(unescape(decodeURI(userCtx)));
      parsedCtx.locale = locale;
      return parsedCtx;
    } catch (e) {
      return;
    }
  };

  const getDbInfo = function() {
    const dbName = 'medic';
    return {
      name: dbName,
      remote: `${utils.getBaseUrl()}/${dbName}`
    };
  };

  const getLocalDbName = function(dbInfo, username) {
    return dbInfo.name + '-user-' + username;
  };

  const getLocalMetaDbName = (dbInfo, username) => {
    return getLocalDbName(dbInfo, username) + '-meta';
  };

  const setReplicationId = (POUCHDB_OPTIONS, localDb) => {
    return localDb.id().then(id => {
      POUCHDB_OPTIONS.remote_headers['medic-replication-id'] = id;
    });
  };

  const redirectToLogin = (dbInfo) => {
    console.warn('User must reauthenticate');

    if (!document.cookie.includes('login=force')) {
      document.cookie = 'login=force;path=/';
    }

    const currentUrl = encodeURIComponent(window.location.href);
    window.location.href = '/' + dbInfo.name + '/login?redirect=' + currentUrl;
  };

  // TODO Use a shared library for this duplicated code #4021
  const hasRole = function(userCtx, role) {
    if (userCtx.roles) {
      for (let i = 0; i < userCtx.roles.length; i++) {
        if (userCtx.roles[i] === role) {
          return true;
        }
      }
    }
    return false;
  };

  const hasFullDataAccess = function(userCtx) {
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
    const content = `
    <div>
      <p>${errorMessage}</p>
      <a id="btn-reload" class="btn btn-primary" href="#">${tryAgain}</a>
    </div>`;
    $('.bootstrap-layer .error').html(content);
    $('#btn-reload').click(() => window.location.reload(false));
    $('.bootstrap-layer .loader, .bootstrap-layer .status').hide();
    $('.bootstrap-layer .error').show();
  };

  /* pouch db set up function */
  module.exports = function(POUCHDB_OPTIONS, callback) {

    const dbInfo = getDbInfo();
    const userCtx = getUserCtx();
    const hasForceLoginCookie = document.cookie.includes('login=force');
    if (!userCtx || hasForceLoginCookie) {
      return redirectToLogin(dbInfo);
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

    const localMetaDb = window.PouchDB(getLocalMetaDbName(dbInfo, userCtx.name), POUCHDB_OPTIONS.local);

    Promise
      .all([
        initialReplicationLib.isReplicationNeeded(localDb, userCtx),
        swRegistration,
        setReplicationId(POUCHDB_OPTIONS, localDb)
      ])
      .then(([isInitialReplicationNeeded]) => {
        utils.setOptions(POUCHDB_OPTIONS);

        if (isInitialReplicationNeeded) {
          const replicationStarted = performance.now();
          // Polling the document count from the db.
          return initialReplicationLib
            .replicate(setUiStatus, remoteDb, localDb)
            .then(() => initialReplicationLib.isReplicationNeeded(localDb, userCtx))
            .then(isReplicationStillNeeded => {
              if (isReplicationStillNeeded) {
                throw new Error('Initial replication failed');
              }
            })
            .then(() => window.startupTimes.replication = performance.now() - replicationStarted);
        }
      })
      .then(() => {
        const purgeStarted = performance.now();
        return purger
          .purgeMain(localDb, userCtx)
          .on('start', () => setUiStatus('PURGE_INIT'))
          .on('progress', progress => setUiStatus('PURGE_INFO', { count: progress.purged }))
          .on('done', () => window.startupTimes.purge = performance.now() - purgeStarted)
          .catch(err => {
            console.error('Error attempting to purge main db - continuing', err);
            window.startupTimes.purgingFailed = err.message;
          });
      })
      .then(() => {
        const purgeMetaStarted = performance.now();
        return purger
          .purgeMeta(localMetaDb)
          .on('should-purge', shouldPurge => window.startupTimes.purgingMeta = shouldPurge)
          .on('start', () => setUiStatus('PURGE_META'))
          .on('done', () => window.startupTimes.purgeMeta = performance.now() - purgeMetaStarted)
          .catch(err => {
            console.error('Error attempting to purge meta db - continuing', err);
            window.startupTimes.purgingMetaFailed = err.message;
          });
      })
      .then(() => setUiStatus('STARTING_APP'))
      .catch(err => err)
      .then(err => {
        localDb.close();
        remoteDb.close();
        localMetaDb.close();

        if (err) {
          const errorCode = err.status || err.code;
          if (errorCode === 401) {
            return redirectToLogin(dbInfo);
          }
          setUiError(err);
        }

        callback(err);
      });

  };

}());
