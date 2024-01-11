angular.module('controllers').controller('ExportUserDevicesCtrl',
  function (
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      Export('user-devices', {}, {});
    };

  });
