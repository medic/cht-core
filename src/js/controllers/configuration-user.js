angular.module('inboxControllers').controller('ConfigurationUserCtrl',
  function (
    Modal
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.updatePassword = function() {
      Modal({
        templateUrl: 'templates/modals/update_password.html',
        controller: 'EditUserCtrl',
        controllerAs: 'editUserCtrl'
      });
    };

    ctrl.editSettings = function() {
      Modal({
        templateUrl: 'templates/modals/edit_user_settings.html',
        controller: 'EditUserCtrl',
        controllerAs: 'editUserCtrl'
      });
    };

  }
);
