angular.module('controllers').controller('TargetsCtrl',
  function (
    $log,
    $scope,
    $state,
    Settings
  ) {

    'use strict';
    'ngInject';

    $scope.configuration = {};
    $scope.loading = true;
    $scope.error = false;

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
