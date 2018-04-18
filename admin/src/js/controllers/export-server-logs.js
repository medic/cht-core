angular.module('controllers').controller('ExportServerLogsCtrl',
  function (
    $log,
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      $scope.exporting = true;
      Export({}, 'logs').then(function() {
        $scope.exporting = false;
      });
    };
  }
);
