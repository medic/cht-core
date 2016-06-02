var COOKIE_NAME = 'userCtx',
    utils = require('kujua-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Session',
    function(
      $log,
      $window,
      ipCookie,
      KansoPackages,
      Location
    ) {

      'ngInject';

      var getUserCtx = function() {
        return ipCookie(COOKIE_NAME);
      };

      var waitForAppCache = function(callback) {
        var appCache = $window.applicationCache;
        if (appCache && appCache.status === appCache.DOWNLOADING) {
          return appCache.addEventListener('updateready', callback);
        }
        callback();
      };

      var navigateToLogin = function() {
        $log.warn('User must reauthenticate');
        ipCookie.remove(COOKIE_NAME);
        waitForAppCache(function() {
          $window.location.href = '/' + Location.dbName + '/login' +
            '?redirect=' + encodeURIComponent($window.location.href);
        });
      };

      var logout = function() {
        KansoPackages.session.logout(navigateToLogin);
      };

      var checkCurrentSession = function() {
        var userCtx = getUserCtx();
        if (!userCtx || !userCtx.name) {
          return logout();
        }
        KansoPackages.session.info(function(err, response) {
          if (err && err.status === 401) {
            // connected to the internet but no session on the server
            navigateToLogin();
          } else if (!err && userCtx.name !== response.userCtx.name) {
            // connected to the internet but server session is different
            logout();
          }
        });
      };

      var listenForSessionChanges = function() {
        // listen for logout events
        KansoPackages.session.on('change', checkCurrentSession);
      };

      return {
        logout: logout,

        /**
         * Get the user context of the logged in user. This will return
         * null if the user is not logged in.
         */
        userCtx: getUserCtx,

        navigateToLogin: navigateToLogin,

        init: function() {
          checkCurrentSession();
          listenForSessionChanges();
        },

        isAdmin: function() {
          return utils.isUserAdmin(getUserCtx());
        }
      };

    }
  );

}());
