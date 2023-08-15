angular.module('controllers').controller('TargetsCtrl',
  function (
    $log,
    $scope,
    $state,
    Settings,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    $scope.configuration = {};
    $scope.loading = true;
    $scope.error = false;

    const setEnabled = function(value) {
      const settings = { tasks: { targets: { enabled: value } } };
      UpdateSettings(settings)
        .then(function() {
          $scope.configuration.enabled = value;
        })
        .catch(function(err) {
          $log.error('Error updating settings', err);
        });
    };

    $scope.enable = function() {
      setEnabled(true);
    };

    $scope.disable = function() {
      setEnabled(false);
    };

    $scope.edit = function(id) {
      $state.go('targets-edit', { id: id });
    };

    Settings()
      .then(function(settings) {
        $scope.loading = false;
        $scope.configuration = settings.tasks && settings.tasks.targets;
      })
      .catch(function(err) {
        $scope.loading = false;
        $scope.error = true;
        $log.error('Error fetching settings', err);
      });

  });
