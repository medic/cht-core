angular.module('inboxControllers').controller('ConfigurationUserCtrl',
  function (
    $scope,
    Modal
  ) {

    'use strict';
    'ngInject';

    $scope.updatePassword = function() {
      Modal({
        templateUrl: 'templates/modals/update_password.html',
        controller: 'EditUserCtrl'
      });
    };

    $scope.editSettings = function() {
      Modal({
        templateUrl: 'templates/modals/edit_user_settings.html',
        controller: 'EditUserCtrl'
      });
    };

  }
);
