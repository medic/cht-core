angular.module('inboxControllers').controller('LogoutConfirmCtrl',
  function(
    $scope,
    $uibModalInstance,
    Session
  ) {
    'use strict';
    'ngInject';

    $scope.submit = function() {
      $scope.setProcessing();
      Session.logout();
      $uibModalInstance.close();
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };
  }
);
