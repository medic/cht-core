angular.module('controllers').controller('ExportAuditLogsCtrl',
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
