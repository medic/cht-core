var _ = require('underscore');

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

    var check = function(permissions, userRoles, settings, expected) {
      return _.every(permissions, function(permission) {
        var required = _.findWhere(settings.permissions, { name: permission });
        if (!required) {
          return !expected;
        }
        var found = _.intersection(userRoles, required.roles).length > 0;
        return expected === found;
      });
    };

    var isRequired = function(permission) {
      return permission.indexOf('!') !== 0;
    };

    var getRequired = function(permissions) {
      return _.filter(permissions, isRequired);
    };

    var getDisallowed = function(permissions) {
      permissions = _.reject(permissions, isRequired);
      permissions = _.map(permissions, function(permission) {
        return permission.substring(1);
      });
      return permissions;
    };

    var authFail = function(reason, permissions, roles) {
      $log.debug('Auth failed: ' + reason + '. User roles: ' + roles + '. Wanted permissions: ' + permissions);
      return $q.reject();
    };

    var checkPermissions = function(required, disallowed, roles, settings) {
      if (!check(required, roles, settings, true)) {
        return 'missing required permission(s)';
      }

      if (!check(disallowed, roles, settings, false)) {
        return 'found disallowed permission(s)';
      }

      return true;
    };

    var getRoles = function() {
      var userCtx = Session.userCtx();
      if (!userCtx) {
        return $q.reject(new Error('Not logged in'));
      }
      var roles = userCtx.roles;
      if (!roles || roles.length === 0) {
        return authFail('user has no roles');
      }

      return $q.resolve(roles);
    };

    var auth = function(permissions) {
      return getRoles().then(function(roles) {
        if (!_.isArray(permissions)) {
          permissions = [ permissions ];
        }

        var requiredPermissions = getRequired(permissions);
        var disallowedPermissions = getDisallowed(permissions);

        if (_.contains(roles, '_admin')) {
          if (disallowedPermissions.length > 0) {
            return authFail('disallowed permission(s) found for admin', permissions, roles);
          }
          return $q.resolve();
        }

        return Settings().then(function(settings) {
          var result = checkPermissions(requiredPermissions, disallowedPermissions, roles, settings);
          if (result !== true) {
            return authFail(result, permissions, roles);
          }

          return $q.resolve();
        });
      });
    };

    auth.any = function(permissionsList) {
      return getRoles().then(function(roles) {
        if (!_.isArray(permissionsList)) {
          return auth(permissionsList);
        }

        var requiredPermissions = _.map(permissionsList, function(permissions) {
          return getRequired(permissions);
        });
        var disallowedPermissions = _.map(permissionsList, function(permissions) {
          return getDisallowed(permissions);
        });

        if (_.contains(roles, '_admin')) {
          if (_.every(disallowedPermissions, function(permissions) { return permissions.length; })) {
            return authFail('missing required permission(s)', permissionsList, roles);
          }

          return $q.resolve();
        }

        return Settings().then(function(settings) {
          var validPermissions = permissionsList
            .map(function(permissions, key) {
              return checkPermissions(requiredPermissions[key], disallowedPermissions[key], roles, settings);
            })
            .filter(function(result) {
              return result === true;
            });

          if (!validPermissions.length) {
            return authFail('no matching permissions', permissionsList, roles);
          }

          return $q.resolve();
        });
      });
    };

    auth.online = function(online) {
      var userCtx = Session.userCtx();
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
