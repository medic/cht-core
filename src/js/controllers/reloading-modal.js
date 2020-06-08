/*
Controller for the Modal service which executes $window.reload when submitted.
*/
angular.module('inboxControllers').controller('ReloadingModalCtrl',
  function (
    $uibModalInstance,
    $window
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.submit = function() {
      $uibModalInstance.close();
      $window.location.reload();
    };

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
);
