angular.module('inboxControllers').controller('NavigationConfirmCtrl',
  function (
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };

    ctrl.submit = function() {
      $uibModalInstance.close();
    };

  }
);
