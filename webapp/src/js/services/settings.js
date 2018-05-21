(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  var SETTINGS_ID = 'settings';

  inboxServices.factory('Settings',
    function(
      $log,
      $q,
      Cache,
      DB,
      Session
    ) {

      'ngInject';

      var cache = Cache({
        get: function(callback) {
          DB()
            .get(SETTINGS_ID)
            .then(function(doc) {
              callback(null, doc.settings);
            })
            .catch(function(err) {
              if (err && err.status === 401) {
                Session.navigateToLogin();
              }
              callback(err);
            });
        },
        invalidate: function(doc) {
          return doc._id === SETTINGS_ID;
        }
      });

      return function() {
        var listeners = {};

        function emit(event, data) {
          if (listeners[event]) {
            listeners[event].forEach(function(callback) {
              try {
                callback(data);
              } catch(e) {
                $log.error('Error triggering listener callback.', event, data, callback);
              }
            });
          }
        }

        var deferred = $q(function(resolve, reject) {
          cache(function(err, settings) {
            if (err) {
              emit('error', err);
              return reject(err);
            }
            emit('change', settings);
            resolve(settings);
          });
        });

        deferred.on = function(event, callback) {
          if (!listeners[event]) {
            listeners[event] = [];
          }
          listeners[event].push(callback);

          return deferred;
        };

        return deferred;
      };
    }
  );

}());
