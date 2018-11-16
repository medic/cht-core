var COOKIE_NAME = 'userCtx',
    ONLINE_ROLE = 'mm-online',
    _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Session',
    function(
      $http,
      $log,
      $window,
      ipCookie,
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
        ipCookie.remove(COOKIE_NAME, { path: '/' });
        waitForAppCache(function() {
          $window.location.href = '/' + Location.dbName + '/login' +
            '?redirect=' + encodeURIComponent($window.location.href);
        });
      };

      var logout = function() {
        $http.delete('/_session')
          .catch(function() {
            // Ignore exception. User can already be logged out.
          })
          .then(navigateToLogin);
      };

      var refreshUserCtx = function(callback) {
        $http
          .get('/' + Location.dbName + '/login/identity')
          .then(function() {
            if (_.isFunction(callback)) {
              callback();
            }
          })
          .catch(function() {
            logout();
          });
      };

      var checkCurrentSession = function(callback) {
        var userCtx = getUserCtx();
        if (!userCtx || !userCtx.name) {
          return logout();
        }
        $http.get('/_session')
          .then(function(response) {
            var name = response.data &&
                       response.data.userCtx &&
                       response.data.userCtx.name;
            if (name !== userCtx.name) {
              // connected to the internet but server session is different
              return logout();
            }
            if (_.difference(userCtx.roles, response.data.userCtx.roles).length ||
                _.difference(response.data.userCtx.roles, userCtx.roles).length) {
              return refreshUserCtx(callback);
            }
          })
          .catch(function(response) {
            if (response.status === 401) {
              // connected to the internet but no session on the server
              navigateToLogin();
            }
          });
      };

      // TODO Use a shared library for this duplicated code #4021
      var hasRole = function(userCtx, role) {
        return _.contains(userCtx && userCtx.roles, role);
      };

      var isAdmin = function(userCtx) {
        userCtx = userCtx || getUserCtx();
        return hasRole(userCtx, '_admin') ||
               hasRole(userCtx, 'national_admin'); // deprecated: kept for backwards compatibility: #4525
      };

      var isDbAdmin = function(userCtx) {
        userCtx = userCtx || getUserCtx();
        return hasRole(userCtx, '_admin');
      };

      return {
        logout: logout,

        /**
         * Get the user context of the logged in user. This will return
         * null if the user is not logged in.
         */
        userCtx: getUserCtx,

        navigateToLogin: navigateToLogin,

        init: checkCurrentSession,

        /**
         * Returns true if the logged in user has the db or national admin role.
         * @param {userCtx} (optional) Will get the current userCtx if not provided.
         */
        isAdmin: isAdmin,

        // Returns true if the logged in user is a DB admin
        // @param {userCtx} (optional) Will get the current userCtx if not provided.
        isDbAdmin: isDbAdmin,

        /**
         * Returns true if the logged in user is online only
         */
        isOnlineOnly: function(userCtx) {
          userCtx = userCtx || getUserCtx();
          return isAdmin(userCtx) ||
                 hasRole(userCtx, ONLINE_ROLE);
        }
      };

    }
  );

}());
