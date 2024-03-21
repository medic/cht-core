angular.module('controllers').controller('ExportReportsCtrl',
  function (
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      if ($scope.exporting) {
        return;
      }

      $scope.exporting = true;
      Export('reports', {}, { humanReadable: true })
        .finally(() => {
          $scope.exporting = false;
          $scope.$apply();
        });
    };

  });
