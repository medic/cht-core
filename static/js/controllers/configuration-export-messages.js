angular.module('inboxControllers').controller('ConfigurationExportMessagesCtrl',
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
