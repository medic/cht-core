angular.module('controllers').controller('ExportUserDevicesCtrl',
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
      Export('user-devices', {}, {})
        .finally(() => {
          $scope.exporting = false;
          $scope.$apply();
        });
    };

  });
