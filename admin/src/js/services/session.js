const COOKIE_NAME = 'userCtx';
const ONLINE_ROLE = 'mm-online';
const _ = require('lodash/core');

(function () {

  'use strict';

  angular.module('inboxServices').factory('Session',
    function(
      $http,
      $log,
      $window,
      Location,
      ipCookie
    ) {

      'ngInject';

      let userCtxCookieValue;
      const getUserCtx = function() {
        if (!userCtxCookieValue) {
          userCtxCookieValue = ipCookie(COOKIE_NAME);
        }

        return userCtxCookieValue;
      };

      const navigateToLogin = function() {
        $log.warn('User must reauthenticate');
        const params = new URLSearchParams();
        params.append('redirect', $window.location.href);

        const userCtx = getUserCtx();
        const username = userCtx && userCtx.name;
        if (username) {
          params.append('username', username);
        }
        ipCookie.remove(COOKIE_NAME, { path: '/' });
        userCtxCookieValue = undefined;
        $window.location.href = `/${Location.dbName}/login?${params.toString()}`;
      };

      const logout = function() {
        return $http.delete('/_session')
          .catch(function() {
            // Set cookie to force login before using app
            ipCookie('login', 'force', { path: '/' });
          })
          .then(navigateToLogin);
      };

      const refreshUserCtx = function() {
        return $http
          .get('/' + Location.dbName + '/login/identity')
          .catch(function() {
            return logout();
          });
      };

      const checkCurrentSession = function() {
        const userCtx = getUserCtx();
        if (!userCtx || !userCtx.name) {
          return logout();
        }
        return $http.get('/_session')
          .then(function(response) {
            const name = response.data &&
                       response.data.userCtx &&
                       response.data.userCtx.name;
            if (name !== userCtx.name) {
              // connected to the internet but server session is different
              return logout();
            }
            if (_.difference(userCtx.roles, response.data.userCtx.roles).length ||
                _.difference(response.data.userCtx.roles, userCtx.roles).length) {
              return refreshUserCtx().then(() => true);
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
      const hasRole = function(userCtx, role) {
        return !!(userCtx && userCtx.roles && userCtx.roles.includes(role));
      };

      const isAdmin = function(userCtx) {
        userCtx = userCtx || getUserCtx();
        return hasRole(userCtx, '_admin') ||
               hasRole(userCtx, 'national_admin'); // deprecated: kept for backwards compatibility: #4525
      };

      const isDbAdmin = function(userCtx) {
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

        checkCurrentSession: checkCurrentSession,

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
