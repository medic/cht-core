angular.module('inboxControllers').controller('LogoutConfirmCtrl',
  function(
    $scope,
    $uibModalInstance,
    Session
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.submit = function() {
      $scope.setProcessing();
      Session.logout();
      $uibModalInstance.close();
    };

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };
  }
);
