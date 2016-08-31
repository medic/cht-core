angular.module('inboxControllers').controller('ConfigurationExportReportsCtrl',
  function (
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      $scope.exporting = true;
      Export({}, 'reports').then(function() {
        $scope.exporting = false;
      });
    };

  }
);
