/*
Handles the initial registration of the service worker
*/

'use strict';

function register(onInstalling) {
  if (!window.navigator.serviceWorker) {
    return Promise.reject(new Error('Service worker not supported'));
  }

  return new Promise(function (resolve, reject) {
    window.navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        // Do nothing if service worker is already up to date
        if (!registration.installing) {
          return resolve();
        }

        onInstalling();
        registration.onupdatefound = function() {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
            case 'activated':
              resolve(installingWorker);
              installingWorker.onstatechange = undefined;
              break;
            case 'redundant':
              reject(new Error('Service worker labeled redundant'));
              installingWorker.onstatechange = undefined;
              break;
            default:
              console.debug(`Service worker state changed to ${installingWorker.state}`);
            }
          };
        };
      })
      .catch(reject);
  });
}

module.exports = register;
