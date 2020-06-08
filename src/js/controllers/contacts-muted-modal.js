angular.module('inboxControllers').controller('ContactsMutedModalCtrl',
  function(
    $uibModalInstance
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.submit = function() {
      $uibModalInstance.close();
    };

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };
  }
);
