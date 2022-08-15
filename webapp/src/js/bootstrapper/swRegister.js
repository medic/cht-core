/*
Handles the initial registration of the service worker
*/

'use strict';

const register = (onInstalling) => {
  if (!window.navigator.serviceWorker) {
    return Promise.reject(new Error('Service worker not supported'));
  }

  return new Promise((resolve, reject) => {
    window.navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        // Do nothing if service worker is already up to date
        if (!registration.installing) {
          return resolve();
        }

        onInstalling();
        const installingWorker = registration.installing;
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'activated') {
            installingWorker.onstatechange = undefined;
            return resolve(installingWorker);
          }

          if (installingWorker.state === 'redundant') {
            installingWorker.onstatechange = undefined;
            return reject(new Error('Service worker labeled redundant'));
          }

          console.debug(`Service worker state changed to ${installingWorker.state}`);
        };
      })
      .catch(reject);
  });
};

module.exports = register;
