/*
Auth.has resolves true if the current user's role has all the permissions passed in as arguments.
If a permission has a '!' prefix, resolves true only if the user doesn't have the permission.
DB admins automatically have all permissions.

Auth.assert behaves as Auth.has but throws an error instead of resolving false

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
      getRoles().then(roles => {
        if (!Array.isArray(permissionsList)) {
          return assert(permissionsList);
        }

        const requiredPermissions = permissionsList.map(permissions => getRequired(permissions));
        const disallowedPermissions = permissionsList.map(permissions => getDisallowed(permissions));

        if (roles.includes('_admin')) {
          if (disallowedPermissions.every(permissions => permissions.length)) {
            return authFail('missing required permission(s)', permissionsList, roles);
          }

          return $q.resolve();
        }

        return Settings().then(settings => {
          const validPermissions = permissionsList.some((permission, i) => {
            return !permissionError(requiredPermissions[i], disallowedPermissions[i], roles, settings);
          });

          if (!validPermissions) {
            return authFail('no matching permissions', permissionsList, roles);
          }

          return $q.resolve();
        });
      })
    );

    const assert = permissions => (
      getRoles().then(roles => {
        if (!Array.isArray(permissions)) {
          permissions = [ permissions ];
        }

        const requiredPermissions = getRequired(permissions);
        const disallowedPermissions = getDisallowed(permissions);

        if (roles.includes('_admin')) {
          if (disallowedPermissions.length > 0) {
            return authFail('disallowed permission(s) found for admin', permissions, roles);
          }
          return $q.resolve();
        }

        return Settings().then(settings => {
          const error = permissionError(requiredPermissions, disallowedPermissions, roles, settings);
          if (error) {
            return authFail(error, permissions, roles);
          }

          return $q.resolve();
        });
      })
    );

    const has = permissions => assert(permissions).then(() => true).catch(() => false);

    const online = (online) => {
      const userCtx = Session.userCtx();
      if (!userCtx) {
        return $q.reject(new Error('Not logged in'));
      }

      if (Session.isOnlineOnly(userCtx) !== Boolean(online)) {
        return authFail(online ? 'user missing online role' : 'user has online role', [], userCtx.roles);
      }

      return $q.resolve();
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

    const authFail = (reason, permissions, roles) => {
      $log.debug(`Auth failed: ${reason}. User roles: ${roles}. Wanted permissions: ${permissions}`);
      return $q.reject();
    };

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
        return authFail('user has no roles');
      }

      return $q.resolve(roles);
    };

    return {
      any,
      assert,
      has,
      online,
    };
  }
);
