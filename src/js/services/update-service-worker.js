/*
Handles service worker updates
*/
angular.module('inboxServices').factory('UpdateServiceWorker', function(
  $log,
  $timeout,
  $window,
  Snackbar
) {
  'use strict';
  'ngInject';

  const retryFailedUpdateAfterSec = 5 * 60;
  let existingUpdateLoop;

  function update(onSuccess) {
    // This avoids multiple updates retrying in parallel
    if (existingUpdateLoop) {
      $timeout.cancel(existingUpdateLoop);
      existingUpdateLoop = undefined;
    }

    $window.navigator.serviceWorker.getRegistrations()
      .then(function(registrations) {
        const registration = registrations && registrations.length && registrations[0];
        if (!registration) {
          $log.warn('Cannot update service worker - no active workers found');
          return;
        }

        registration.onupdatefound = function() {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
            case 'activated':
              Snackbar('New service worker activated', {dev: true});
              registration.onupdatefound = undefined;
              onSuccess();
              break;
            case 'redundant':
              $log.warn(
                'Service worker failed to install or marked as redundant. ' +
                `Retrying install in ${retryFailedUpdateAfterSec}secs.`
              );
              existingUpdateLoop = $timeout(() => update(onSuccess), retryFailedUpdateAfterSec * 1000);
              registration.onupdatefound = undefined;
              break;
            default:
              $log.debug(`Service worker state changed to ${installingWorker.state}!`);
            }
          };
        };

        registration.update();
      });
  }

  return update;
});
