(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

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
            .get('_design/medic-client')
            .then(function(ddoc) {
              callback(null, ddoc.app_settings);
            })
            .catch(function(err) {
              if (err && err.status === 401) {
                Session.navigateToLogin();
              }
              callback(err);
            });
        },
        invalidate: function(doc) {
          return doc._id === '_design/medic-client';
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
