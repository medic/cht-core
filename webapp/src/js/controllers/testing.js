const purger = require('../bootstrapper/purger');
const uuid = require('uuid');

angular.module('inboxControllers').controller('TestingCtrl',
  function(
    $log,
    $q,
    $window,
    DB,
    Debug,
    Feedback,
    Session,
    ipCookie
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.debugEnabled = Debug.get();
    ctrl.amountFeedbackDocs = 5000;

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

    ctrl.generateFeedback = () => {
      if (isNaN(ctrl.amountFeedbackDocs)) {
        $log.error('Incorrect number of feedback docs', ctrl.amountFeedbackDocs);
        return;
      }

      let p = $q.resolve();
      ctrl.generatingFeedback = true;
      for (let i = 0; i < parseInt(ctrl.amountFeedbackDocs); i++) {
        p = p.then(() => Feedback.submit(uuid()));
      }
      p.then(() => ctrl.generatingFeedback = false);
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
