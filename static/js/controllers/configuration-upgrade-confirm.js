angular.module('inboxControllers').controller('ConfigurationUpgradeConfirmCtrl',
  function (
    $scope,
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    $scope.submit = function() {
      $uibModalInstance.close(true);
    };
  }
);
