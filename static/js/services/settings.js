(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DdocCache',
    function(
      DB,
      Session,
      Cache
    ) {
      'ngInject';

    // NOSHIP: instead, move app_settings and schema out of the ddoc
    var DDOC_ID = '_design/medic';

      return Cache({
        get: function(callback) {
          DB()
            .get(DDOC_ID)
            .then(function(ddoc) {
              callback(null, ddoc);
            })
            .catch(function(err) {
              if (err && err.status === 401) {
                Session.navigateToLogin();
              }
              callback(err);
            });
        },
        invalidate: function(doc) {
          return doc._id === DDOC_ID;
        }
      });
    });

  inboxServices.factory('Settings',
    function(
      $log,
      $q,
      DdocCache
    ) {

      'ngInject';

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
          DdocCache(function(err, ddoc) {
            var settings = ddoc.app_settings;
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


  inboxServices.factory('SettingsSchema',
    function(
      $q,
      DdocCache
      ) {

      'ngInject';

      return $q(function(resolve, reject) {
        DdocCache(function(err, ddoc) {
          if (err) {
            return reject(err);
          }
          return resolve(ddoc.kanso.config.settings_schema);
        });
      });
    });

}());
