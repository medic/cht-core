angular.module('inboxControllers').controller('CheckDateCtrl',
  function (
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.ok = function() {
      $uibModalInstance.close();
    };

  }
);
