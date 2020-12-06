angular.module('inboxControllers').controller('UpdatedPasswordCtrl',
  function(
    $window
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.submit = function() {
      $window.location.reload(true);
    };
  }
);
