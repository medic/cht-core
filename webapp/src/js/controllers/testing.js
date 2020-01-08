const purger = require('../bootstrapper/purger');

angular.module('inboxControllers').controller('TestingCtrl',
  function(
    $log,
    $q,
    $window,
    DB,
    Debug,
    Session,
    ipCookie
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.debugEnabled = Debug.get();

    const setDebug = val => {
      Debug.set(val);
      ctrl.debugEnabled = val;
    };

    ctrl.enableDebug = () => {
      setDebug(true);
    };

    ctrl.disableDebug = () => {
      setDebug(false);
    };

    ctrl.purge = () => {
      ctrl.purging = true;
      const localDb = DB({ remote: false });
      const userCtx = Session.userCtx();
      purger
        .purge(localDb, userCtx)
        .on('progress', progress => $log.info('Purge progress', progress))
        .catch(err => $log.error('Error attempting to purge', err))
        .then(() => {
          ctrl.purging = false;
        });
    };

    const wipeLocalStorage = () => {
      $window.localStorage.clear();
      return $q.resolve();
    };

    const wipeServiceWorkers = () => {
      if ($window.navigator && $window.navigator.serviceWorker) {
        return $window.navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
      }
      return $q.resolve();
    };

    const wipeDatabases = () => {
      return $q
        .all([
          DB({ remote: false }).destroy(),
          DB({ remote: false, meta: true }).destroy()
        ])
        .catch(err => $log.error('Error wiping databases', err));
    };

    const wipeCookies = () => {
      Object.keys(ipCookie()).forEach(name => {
        ipCookie.remove(name, { path: '/' });
      });
      return $q.resolve();
    };

    ctrl.wipe = () => {
      ctrl.wiping = true;
      $q
        .all([
          wipeLocalStorage(),
          wipeServiceWorkers(),
          wipeDatabases(),
          wipeCookies()
        ])
        .then(() => {
          ctrl.wiping = false;
          Session.logout();
        });
    };

  }
);
