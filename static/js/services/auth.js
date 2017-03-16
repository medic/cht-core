var _ = require('underscore');

/*
  Auth service returns a promise that will be resolved if
  the current user's role has all the permissions passed
  in as arguments. If a permission has a '!' prefix this
  will resolve only if the user doesn't have the permission.

  DB admins automatically have all permissions.
*/

angular.module('inboxServices').factory('Auth',
  function(
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

    var authFail = function(reason) {
      return $q.reject(new Error('Auth failed: ' + reason));
    };

    return function(permissions) {
      if (!_.isArray(permissions)) {
        permissions = [ permissions ];
      }
      var userCtx = Session.userCtx();
      if (!userCtx) {
        return authFail('not logged in');
      }
      var roles = userCtx.roles;
      if (!roles || roles.length === 0) {
        return authFail('user has no roles');
      }
      var requiredPermissions = getRequired(permissions);
      var disallowedPermissions = getDisallowed(permissions);
      if (_.contains(roles, '_admin')) {
        if (disallowedPermissions.length > 0) {
          return authFail('disallowed permission(s) found');
        }
        return $q.resolve();
      }
      return Settings().then(function(settings) {
        if (check(requiredPermissions, roles, settings, true) &&
            check(disallowedPermissions, roles, settings, false)) {
          return $q.resolve();
        }
        return authFail('missing required permission(s)');
      });
    };

  }
);
