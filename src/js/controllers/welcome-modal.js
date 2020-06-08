angular.module('inboxControllers').controller('WelcomeModalCtrl',
  function(
    $uibModalInstance
  ) {

    'ngInject';
    'use strict';

    const ctrl = this;

    ctrl.start = function() {
      $uibModalInstance.dismiss();
    };
  }
);
