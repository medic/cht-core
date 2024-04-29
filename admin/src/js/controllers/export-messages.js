angular.module('controllers').controller('ExportMessagesCtrl',
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
      Export('messages', {}, { humanReadable: true })
        .finally(() => {
          $scope.exporting = false;
          $scope.$apply();
        });
    };

  });
