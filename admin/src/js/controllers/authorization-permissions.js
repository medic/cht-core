angular.module('controllers').controller('AuthorizationPermissionsCtrl',
  function (
    $scope,
    $log,
    Settings,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;

    var makeRoleModel = function(roles) {
      return Object.keys($scope.roles).map(function(key) {
        return {
          name: key,
          value: roles.indexOf(key) !== -1,
        };
      });
    };

    Settings()
      .then(function(settings) {
        $scope.loading = false;

        $scope.roles = settings.roles;

        // add the configured permissions
        $scope.permissions = [];
        Object.keys(settings.permissions).map(function(key) {
          $scope.permissions.push({
            name: key,
            roles: makeRoleModel(settings.permissions[key]),
          });
        });
      })
      .catch(function(err) {
        $log.error('Error fetching settings', err);
        $scope.loading = false;
      });

    var getEnabledRoles = function(roles) {
      return roles
        .filter(function(role) {
          return role.value;
        })
        .map(function(role) {
          return role.name;
        });
    };

    var mapUpdatesToSettings = function(updates) {
      var obj = {};
      updates.forEach(function(updated) {
        obj[updated.name] = getEnabledRoles(updated.roles);
      });
      return obj;
    };

    $scope.submit = function() {
      var settings = {
        permissions: mapUpdatesToSettings($scope.permissions)
      };
      $scope.submitting = true;
      UpdateSettings(settings, { replace: true })
        .catch(function(err) {
          $scope.error = 'Error saving settings';
          $log.error('Error updating settings', err);
        })
        .then(function() {
          $scope.submitting = false;
        });
    };
  }
);
