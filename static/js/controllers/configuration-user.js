(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationUserCtrl',
    function (
      $log,
      $scope,
      Modal
    ) {

      'ngInject';

      $scope.updatePassword = function() {
        Modal({
          templateUrl: 'templates/modals/update_password.html',
          controller: 'EditUserCtrl',
          args: {
            processingFunction: null,
            model: null
          }
        })
        .catch(function(err) {
          $log.debug('User cancelled update password.', err);
        });
      };

      $scope.editSettings = function() {
        Modal({
          templateUrl: 'templates/modals/edit_user_settings.html',
          controller: 'EditUserCtrl',
          args: {
            processingFunction: null,
            model: null
          }
        })
        .catch(function(err) {
          $log.debug('User cancelled update password.', err);
        });
      };

    }
  );

}());