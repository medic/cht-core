var COOKIE_NAME = 'userCtx';

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Session', ['$window', 'ipCookie', 'KansoPackages', 'DbNameService',
    function($window, ipCookie, KansoPackages, DbNameService) {

      var getUserCtx = function() {
        return ipCookie(COOKIE_NAME);
      };

      var navigateToLogin = function() {
        ipCookie.remove(COOKIE_NAME);
        $window.location.href = '/' + DbNameService() + '/login' +
          '?redirect=' + encodeURIComponent($window.location.href);
      };

      var logout = function() {
        KansoPackages.session.logout(navigateToLogin);
      };

      var checkCurrentSession = function(userCtx) {
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
        KansoPackages.session.on('change', function(remoteUserCtx) {
          if (!remoteUserCtx.name) {
            navigateToLogin();
          }
        });
      };

      return {
        logout: logout,
        userCtx: getUserCtx,
        init: function() {
          var userCtx = getUserCtx();
          if (!userCtx || !userCtx.name) {
            return logout();
          }
          checkCurrentSession(userCtx);
          listenForSessionChanges();
        }
      };

    }
  ]);

}());