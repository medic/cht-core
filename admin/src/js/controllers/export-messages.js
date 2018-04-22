angular.module('controllers').controller('ExportMessagesCtrl',
  function (
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      $scope.exporting = true;
      Export({}, 'messages').then(function() {
        $scope.exporting = false;
      });
    };

  }
);
