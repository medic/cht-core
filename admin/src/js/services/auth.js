/*
Auth.has resolves true if the current user's role has all the permissions passed in as arguments.
If a permission has a '!' prefix, resolves true only if the user doesn't have the permission.
DB admins automatically have all permissions.

Auth.any function receives a list of groups of permissions and returns a promise that will be resolved if the current
user's role has all the permissions of any of the provided groups.
*/

angular.module('inboxServices').factory('Auth',
  function(
    $log,
    $q,
    Session,
    Settings
  ) {

    'ngInject';
    'use strict';

    const any = permissionsList => (
      // The `permissionsList` is an array that contains groups of arrays mainly attributed
      // to the complexity of permssion grouping
      getRoles()
        .then(roles => {
          if (!Array.isArray(permissionsList)) {
            return has(permissionsList);
          }

          const requiredPermissions = permissionsList.map(permissions => getRequired(permissions));
          const disallowedPermissions = permissionsList.map(permissions => getDisallowed(permissions));

          if (roles.includes('_admin')) {
            if (disallowedPermissions.every(permissions => permissions.length)) {
              logAuthFailure('missing required permission(s)', permissionsList, roles);
              return $q.resolve(false);
            }

            return $q.resolve(true);
          }

          return Settings().then(settings => {
            const validPermissions = permissionsList.some((permission, i) => {
              return !permissionError(requiredPermissions[i], disallowedPermissions[i], roles, settings);
            });

            if (!validPermissions) {
              logAuthFailure('no matching permissions', permissionsList, roles);
              return $q.resolve(false);
            }

            return $q.resolve(true);
          });
        })
        .catch(() => false)
    );

    const has = permissions => (
      getRoles()
        .then(roles => {
          if (!Array.isArray(permissions)) {
            permissions = [ permissions ];
          }

          const requiredPermissions = getRequired(permissions);
          const disallowedPermissions = getDisallowed(permissions);

          if (roles.includes('_admin')) {
            if (disallowedPermissions.length > 0) {
              logAuthFailure('disallowed permission(s) found for admin', permissions, roles);
              return $q.resolve(false);
            }
            return $q.resolve(true);
          }

          return Settings().then(settings => {
            const error = permissionError(requiredPermissions, disallowedPermissions, roles, settings);
            if (error) {
              logAuthFailure(error, permissions, roles);
              return $q.resolve(false);
            }

            return $q.resolve(true);
          });
        })
        .catch(() => false)
    );

    const online = (online) => {
      const userCtx = Session.userCtx();
      if (!userCtx) {
        return false;
      }

      if (Session.isOnlineOnly(userCtx) !== Boolean(online)) {
        logAuthFailure(online ? 'user missing online role' : 'user has online role', [], userCtx.roles);
        return false;
      }

      return true;
    };

    const check = (permissions, userRoles, settings, expected) => {
      return permissions.every(permission => {
        const roles = settings.permissions[permission];
        if (!roles) {
          return !expected;
        }
        const found = userRoles.some(role => roles.includes(role));
        return expected === found;
      });
    };

    const isRequired = (permission) => permission.indexOf('!') !== 0;
    const getRequired = (permissions) => permissions.filter(isRequired);
    const getDisallowed = (permissions) => {
      const disallowed = permissions.filter(permission => !isRequired(permission));
      return disallowed.map(permission => permission.substring(1));
    };

    const logAuthFailure = (reason, permissions, roles) =>
      $log.debug(`Auth failed: ${reason}. User roles: ${roles}. Wanted permissions: ${permissions}`);

    const permissionError = (required, disallowed, roles, settings) => {
      if (!check(required, roles, settings, true)) {
        return 'missing required permission(s)';
      }

      if (!check(disallowed, roles, settings, false)) {
        return 'found disallowed permission(s)';
      }

      return false;
    };

    const getRoles = () => {
      const userCtx = Session.userCtx();
      if (!userCtx) {
        return $q.reject(new Error('Not logged in'));
      }

      const roles = userCtx.roles;
      if (!roles || roles.length === 0) {
        logAuthFailure('user has no roles');
        return $q.reject();
      }

      return $q.resolve(roles);
    };

    return {
      any,
      has,
      online,
    };
  }
);
