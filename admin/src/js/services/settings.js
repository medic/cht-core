(function () {

  'use strict';

  const SETTINGS_ID = 'settings';

  angular.module('inboxServices').factory('Settings',
    function(
      $log,
      $q,
      Cache,
      DB
    ) {

      'ngInject';

      const cache = Cache({
        get: function(callback) {
          DB()
            .get(SETTINGS_ID)
            .then(function(doc) {
              callback(null, doc.settings);
            })
            .catch(callback);
        },
        invalidate: function(change) {
          return change.id === SETTINGS_ID;
        }
      });

      return function() {
        const listeners = {};

        const emit = (event, data) => {
          if (listeners[event]) {
            listeners[event].forEach(function(callback) {
              try {
                callback(data);
              } catch (e) {
                $log.error('Error triggering listener callback.', event, data, callback);
              }
            });
          }
        };

        const deferred = $q(function(resolve, reject) {
          cache(function(err, settings) {
            if (err) {
              emit('error', err);
              return reject(err);
            }
            emit('change', settings);
            resolve(settings);
          });
        });

        deferred.on = (event, callback) => {
          if (!listeners[event]) {
            listeners[event] = [];
          }
          listeners[event].push(callback);

          return deferred;
        };

        return deferred;
      };
    });

}());
