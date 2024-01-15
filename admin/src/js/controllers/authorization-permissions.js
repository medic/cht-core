angular.module('controllers').controller('AuthorizationPermissionsCtrl',
  function (
    $log,
    $scope,
    Settings,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;

    const makeRoleModel = function(roles) {
      return Object.keys($scope.roles).map(function(key) {
        return {
          name: key,
          enabled: roles.includes(key),
        };
      });
    };

    Settings()
      .then(function(settings) {
        $scope.loading = false;
        $scope.roles = settings.roles;
        $scope.permissions = Object.keys(settings.permissions).map(key => {
          return {
            name: key,
            roles: makeRoleModel(settings.permissions[key]),
          };
        });
      })
      .catch(function(err) {
        $log.error('Error fetching settings', err);
        $scope.loading = false;
      });

    const getEnabledRoles = function(roles) {
      return roles
        .filter(function(role) {
          return role.enabled;
        })
        .map(function(role) {
          return role.name;
        });
    };

    const mapUpdatesToSettings = function(updates) {
      const permissions = {};
      updates.forEach(function(updated) {
        permissions[updated.name] = getEnabledRoles(updated.roles);
      });
      return permissions;
    };

    $scope.submit = function() {
      const settings = {
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
  });
