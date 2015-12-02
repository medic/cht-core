var _ = require('underscore');

/*
  Auth service returns a promise that will be resolved if
  the current user's role has all the permissions passed
  in as arguments. If a permission has a '!' prefix this
  will resolve only if the user doesn't have the permission.

  DB admins automatically have all permissions.
*/
(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Auth', ['$q', 'Settings', 'Session',
    function($q, Settings, Session) {

      var check = function(permissions, userRoles, settings, expected) {
        return _.every(permissions, function(permission) {
          var required = _.findWhere(settings.permissions, { name: permission });
          if (!required) {
            return false;
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

      return function(permissions) {
        if (!_.isArray(permissions)) {
          permissions = [ permissions ];
        }
        return $q(function(resolve, reject) {
          var userCtx = Session.userCtx();
          if (!userCtx) {
            return reject(new Error('Not logged in'));
          }
          var roles = userCtx.roles;
          if (!roles || roles.length === 0) {
            return reject();
          }
          var requiredPermissions = getRequired(permissions);
          var disallowedPermissions = getDisallowed(permissions);
          if (_.contains(roles, '_admin')) {
            if (disallowedPermissions.length > 0) {
              return reject();
            }
            return resolve();
          }
          Settings(function(err, settings) {
            if (err) {
              return reject(err);
            }
            if (check(requiredPermissions, roles, settings, true) &&
                check(disallowedPermissions, roles, settings, false)) {
              return resolve();
            }
            return reject();
          });
        });
      };

    }
  ]);

}());