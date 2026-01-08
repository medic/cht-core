(function () {

  'use strict';

  const constants = require('@medic/constants');
  const DOC_IDS = constants.DOC_IDS;

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
            .get(DOC_IDS.SETTINGS)
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
              } catch (err) {
                $log.error('Error triggering listener callback.', event, data, callback, err);
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
