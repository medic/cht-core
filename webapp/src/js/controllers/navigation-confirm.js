angular.module('inboxControllers').controller('NavigationConfirmCtrl',
  function (
    $scope,
    $state,
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    $scope.submit = function() {
      $uibModalInstance.close();
    };

  }
);
