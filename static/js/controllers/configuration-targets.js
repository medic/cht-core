(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationTargetsCtrl',
    ['$scope', '$log', '$state', 'Settings', 'UpdateSettings',
    function ($scope, $log, $state, Settings, UpdateSettings) {

      $scope.configuration = {};
      $scope.loading = true;
      $scope.error = false;

      var setEnabled = function(value) {
        var settings = { tasks: { targets: { enabled: value } } };
        UpdateSettings(settings, function(err) {
          if (err) {
            $log.error('Error updating settings', err);
          }
        });
      };

      $scope.enable = function() {
        setEnabled(true);
      };

      $scope.disable = function() {
        setEnabled(false);
      };

      $scope.edit = function(id) {
        $state.go('configuration.targets-edit', { id: id });
      };

      Settings()
        .then(function(settings) {
          $scope.loading = false;
          $scope.configuration = settings.tasks.targets;
        })
        .catch(function(err) {
          $scope.loading = false;
          $scope.error = true;
          $log.error('Error fetching settings', err);
        });

    }
  ]);

}());