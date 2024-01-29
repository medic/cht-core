angular.module('controllers').controller('AuthorizationRolesCtrl',
  function (
    $log,
    $scope,
    $translate,
    Settings,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    $scope.loading = true;
    $scope.newRole = {};
    $scope.validation = {};

    const validate = function(newRole) {
      const errors = {};
      if (!newRole.key) {
        errors.key = $translate.instant('field is required', {
          field: $translate.instant('configuration.role')
        });
      }
      if (!newRole.name) {
        errors.name = $translate.instant('field is required', {
          field: $translate.instant('translation.key')
        });
      }
      return errors;
    };

    const save = function(changes) {
      return UpdateSettings({ roles: changes }, { replace: true })
        .then(function() {
          $scope.newRole = {};
          $scope.roles = changes;
        })
        .catch(function(err) {
          $log.error('Error updating settings', err);
          $scope.submitting = false;
          $translate('Error saving settings').then(function(error) {
            $scope.error = error;
          });
        });
    };

    Settings()
      .then(function(settings) {
        $scope.loading = false;
        $scope.roles = settings.roles;
      })
      .catch(function(err) {
        $log.error('Error fetching settings', err);
        $scope.loading = false;
      });

    $scope.delete = function(deleteKey) {
      // clone the roles so the UI doesn't update yet
      const changes = {};
      Object.keys($scope.roles).forEach(function(key) {
        if (key !== deleteKey) {
          changes[key] = $scope.roles[key];
        }
      });
      $scope.deleting = true;
      save(changes).then(function() {
        $scope.deleting = false;
      });
    };

    $scope.add = function() {
      $scope.error = '';
      $scope.validation = validate($scope.newRole);
      if (Object.keys($scope.validation).length) {
        return;
      }
      $scope.submitting = true;
      // clone the roles so the UI doesn't update yet
      const changes = {};
      Object.keys($scope.roles).forEach(function(key) {
        changes[key] = $scope.roles[key];
      });

      changes[$scope.newRole.key] = {
        name: $scope.newRole.name,
        offline: $scope.newRole.offline
      };
      save(changes).then(function() {
        $scope.submitting = false;
      });
    };

  });
