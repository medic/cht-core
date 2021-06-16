const chtScriptApi = require('@medic/cht-script-api');

angular.module('inboxServices').factory('Auth',
  function(
    $log,
    Session,
    Settings
  ) {

    'use strict';
    'ngInject';

    /**
     * Receives a list of groups of permissions and returns a promise that will be resolved if the
     * current user's role has all the permissions of any of the provided groups.
     * @param permissionsGroupList {string | string[] | string[][]}
     */
    const any = (permissionsGroupList) => {
      // The `permissionsGroupList` is an array that contains groups of permissions,
      // mainly attributed to the complexity of permission grouping
      if (!Array.isArray(permissionsGroupList)) {
        return has(permissionsGroupList);
      }

      const chtApi = chtScriptApi.getApi();

      return Settings()
        .then(settings => {
          const userCtx = Session.userCtx();

          if (!userCtx) {
            $log.debug('AuthService :: Not logged in.');
            return false;
          }

          return chtApi.v1.hasAnyPermission(permissionsGroupList, userCtx, settings);
        })
        .catch(() => false);
    };

    /**
     * Returns true if the current user's role has all the permissions passed in as arguments.
     * If a permission has a '!' prefix, resolves true only if the user doesn't have the permission.
     * DB admins automatically have all permissions.
     * @param permissions {string | string[]}
     */
    const has = (permissions) => {
      const chtApi = chtScriptApi.getApi();

      return Settings()
        .then(settings => {
          const userCtx = Session.userCtx();

          if (!userCtx) {
            $log.debug('AuthService :: Not logged in.');
            return false;
          }

          return chtApi.v1.hasPermissions(permissions, userCtx, settings);
        })
        .catch(() => false);
    };

    const online = (online) => {
      const userCtx = Session.userCtx();

      if (!userCtx) {
        return false;
      }

      if (Session.isOnlineOnly(userCtx) !== Boolean(online)) {
        const reason = online ? 'User missing online role' : 'User has online role';
        $log.debug(`AuthService :: ${reason}. User roles: ${userCtx.roles}`);
        return false;
      }

      return true;
    };

    return {
      any,
      has,
      online,
    };
  }
);
