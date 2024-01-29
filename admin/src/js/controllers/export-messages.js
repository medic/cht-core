angular.module('controllers').controller('ExportMessagesCtrl',
  function (
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      Export('messages', {}, { humanReadable: true });
    };

  });
