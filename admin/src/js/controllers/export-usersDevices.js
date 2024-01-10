angular.module('controllers').controller('ExportUsersDevicesCtrl',
  function (
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      Export('usersDevices', {}, {});
    };

  });
