angular.module('inboxControllers').controller('SessionExpiredModalCtrl',
  function (
    $log,
    $timeout,
    $uibModalInstance,
    Session
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.submit = function() {
      $uibModalInstance.close();
      Session.navigateToLogin();
    };

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
      $timeout(() => {
        $log.debug('Display session expired dialog');
        ctrl.cancel();
      }, 300000);
    };

  }
);
