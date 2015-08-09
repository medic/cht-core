var promise = require('lie'),
    _ = require('underscore');

/*
  Auth service returns a promise that will be resolved if
  the current user's role has all the permissions passed
  in as arguments.

  DB admins automatically have all permissions.
*/
(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('Auth', ['Settings', 'Session',
    function(Settings, Session) {

      var hasAll = function(requiredPermissions, userRoles, config) {
        return _.every(requiredPermissions, function(permission) {
          var required = _.findWhere(config, { name: permission });
          if (!required) {
            return false;
          }
          return _.intersection(userRoles, required.roles).length > 0;
        });
      };

      return function(requiredPermissions) {
        if (!_.isArray(requiredPermissions)) {
          requiredPermissions = [ requiredPermissions ];
        }
        return new promise(function(resolve, reject) {
          var userCtx = Session.userCtx();
          if (!userCtx) {
            return reject(new Error('Not logged in'));
          }
          if (!userCtx.roles || userCtx.roles.length === 0) {
            return reject();
          }
          if (_.contains(userCtx.roles, '_admin')) {
            return resolve();
          }
          Settings(function(err, settings) {
            if (err) {
              return reject(err);
            }
            if (hasAll(requiredPermissions, userCtx.roles, settings.permissions)) {
              return resolve();
            }
            return reject();
          });
        });
      };

    }
  ]);

}());