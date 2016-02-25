var COOKIE_NAME = 'userCtx';

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Session', ['$window', 'ipCookie', 'KansoPackages', 'DbNameService', '$log',
    function($window, ipCookie, KansoPackages, DbNameService, $log) {

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
          $window.location.href = '/' + DbNameService() + '/login' +
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
        userCtx: getUserCtx,
        navigateToLogin: navigateToLogin,
        init: function() {
          checkCurrentSession();
          listenForSessionChanges();
        }
      };

    }
  ]);

}());
