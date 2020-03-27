const purger = require('../bootstrapper/purger');
const uuid = require('uuid');

angular.module('inboxControllers').controller('TestingCtrl',
  function(
    $log,
    $q,
    $window,
    DB,
    Feedback,
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

    ctrl.generateACrazyAmountOfFeedback = () => {
      const nbr = 5000;
      let p = Promise.resolve();
      let st = new Date().getTime();
      for (let i = 0; i < nbr; i++) {
        p = p.then(() => Feedback.submit(uuid() + 'Expected \\",\\" or \\"}\\" but \\"r\\" found.",\n"stack": "SyntaxError: Expected \\",\\" or \\"}\\" but \\"r\\" found.\\n    at https://muso-mali.app.medicmobile.org/js/inbox.js:3:1473724\\n    at parse (https://muso-mali.app.medicmobile.org/js/inbox.js:3:1473758)\\n    at t.value (https://muso-mali.app.medicmobile.org/js/inbox.js:3:1481640)\\n    at t.value (https://muso-mali.app.medicmobile.org/js/inbox.js:3:1488495)\\n    at Object.o.interpolate (https://muso-mali.app.medicmobile.org/js/inbox.js:3:2424731)\\n    at nt (https://muso-mali.app.medicmobile.org/js/inbox.js:3:293439)\\n    at W (https://muso-mali.app.medicmobile.org/js/inbox.js:3:290320)\\n    at S (https://muso-mali.app.medicmobile.org/js/inbox.js:3:300782)\\n    at x (https://muso-mali.app.medicmobile.org/js/inbox.js:3:300657)\\n    at v (https://muso-mali.app.medicmobile.org/js/inbox.js:3:299529)'));
      }
      p.then(() => {
        console.log('duration to generate', nbr, 'feedback docs', (new Date().getTime() - st) / 1000, 's');
        alert('GENERATED');
      });
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
