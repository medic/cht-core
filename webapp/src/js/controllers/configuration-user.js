angular.module('inboxControllers').controller('ConfigurationUserCtrl',
  function (
    Modal,
    UserSettings
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    this.loading = true;
    UserSettings().then(user => {
      this.loading = false;
      this.user = user;
    });

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
