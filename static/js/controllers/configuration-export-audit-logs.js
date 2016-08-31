angular.module('inboxControllers').controller('ConfigurationExportAuditLogsCtrl',
  function (
    $log,
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      $scope.exporting = true;
      Export({}, 'audit').then(function() {
        $scope.exporting = false;
      });
    };

  }
);
