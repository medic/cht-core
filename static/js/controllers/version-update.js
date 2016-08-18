angular.module('inboxControllers').controller('VersionUpdateCtrl',
  function (
    $scope,
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    $scope.ok = function() {
      $uibModalInstance.close('ok');
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss('cancel');
    };

  }
);
