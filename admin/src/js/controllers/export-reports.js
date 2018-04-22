angular.module('controllers').controller('ExportReportsCtrl',
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
