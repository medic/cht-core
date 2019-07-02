const _ = require('underscore');

/*
  Auth service returns a promise that will be resolved if
  the current user's role has all the permissions passed
  in as arguments. If a permission has a '!' prefix this
  will resolve only if the user doesn't have the permission.

  DB admins automatically have all permissions.

  Auth.any function receives a list of groups of permissions
  and returns a promise that will be resolved if the current
  user's role has all the permissions of any of the provided
  groups.
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

    const check = (permissions, userRoles, settings, expected) => {
      return _.every(permissions, (permission) => {
        const roles = settings.permissions[permission];
        if (!roles) {
          return !expected;
        }
        const found = _.intersection(userRoles, roles).length > 0;
        return expected === found;
      });
    };

    const isRequired = (permission) => {
      return permission.indexOf('!') !== 0;
    };

    const getRequired = (permissions) => {
      return _.filter(permissions, isRequired);
    };

    const getDisallowed = (permissions) => {
      permissions = _.reject(permissions, isRequired);
      permissions = _.map(permissions, (permission) => {
        return permission.substring(1);
      });
      return permissions;
    };

    const authFail = (reason, permissions, roles) => {
      $log.debug(`Auth failed: ${reason}. User roles: ${roles}. Wanted permissions: ${permissions}`);
      return $q.reject();
    };

    const checkPermissions = (required, disallowed, roles, settings) => {
      if (!check(required, roles, settings, true)) {
        return 'missing required permission(s)';
      }

      if (!check(disallowed, roles, settings, false)) {
        return 'found disallowed permission(s)';
      }
      return true;
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

    const auth = (permissions) => {
      return getRoles().then(roles => {
        if (!_.isArray(permissions)) {
          permissions = [ permissions ];
        }

        const requiredPermissions = getRequired(permissions);
        const disallowedPermissions = getDisallowed(permissions);

        if (_.contains(roles, '_admin')) {
          if (disallowedPermissions.length > 0) {
            return authFail('disallowed permission(s) found for admin', permissions, roles);
          }
          return $q.resolve();
        }

        return Settings().then(settings => {
          const result = checkPermissions(requiredPermissions, disallowedPermissions, roles, settings);
          if (result !== true) {
            return authFail(result, permissions, roles);
          }

          return $q.resolve();
        });
      });
    };

    auth.any = permissionsList => {
      // The `permissionsList` is an array that contains groups of arrays mainly attributed
      // to the complexity of permssion grouping
      return getRoles().then(roles => {
        if (!_.isArray(permissionsList)) {
          return auth(permissionsList);
        }

        const requiredPermissions = _.map(permissionsList, (permissions) => {
          return getRequired(permissions);
        });
        const disallowedPermissions = _.map(permissionsList, (permissions) => {
          return getDisallowed(permissions);
        });

        if (_.contains(roles, '_admin')) {
          if (_.every(disallowedPermissions, (permissions) => { return permissions.length; })) {
            return authFail('missing required permission(s)', permissionsList, roles);
          }

          return $q.resolve();
        }

        return Settings().then(settings => {
          const validPermissions = permissionsList.some((permission, i) => {
            return true === checkPermissions(requiredPermissions[i], disallowedPermissions[i], roles, settings);
          });

          if (!validPermissions) {
            return authFail('no matching permissions', permissionsList, roles);
          }

          return $q.resolve();
        });
      });
    };

    auth.online = (online) => {
      const userCtx = Session.userCtx();
      if (!userCtx) {
        return $q.reject(new Error('Not logged in'));
      }

      if (Session.isOnlineOnly(userCtx) !== Boolean(online)) {
        return authFail(online ? 'user missing online role' : 'user has online role', [], userCtx.roles);
      }

      return $q.resolve();
    };

    return auth;
  }
);
