angular.module('inboxControllers').controller('ConfigurationUserCtrl',
  function (
    $scope,
    Modal,
    OnlineStatus
  ) {

    'use strict';
    'ngInject';

    $scope.updatePassword = function() {
      OnlineStatus().then(function(online) {
        if(online) {
          Modal({
            templateUrl: 'templates/modals/update_password.html',
            controller: 'EditUserCtrl'
          });
        } else {
          Modal({
            templateUrl: 'templates/modals/generic_message.html',
            controller: 'GenericMessageCtrl',
            model: {
                title: 'online.action.title',
                message: 'online.action.message',
                button: 'close'
            }
          });
        }
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
