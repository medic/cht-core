var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('DeleteUserCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'DeleteUser',
    function ($scope, $rootScope, translateFilter, DeleteUser) {

      $scope.$on('DeleteUserInit', function(e, user) {
        $scope.deleteUser = user;
      });

      $scope.deleteUserConfirm = function() {
        var pane = modal.start($('#delete-user-confirm'));
        DeleteUser($scope.deleteUser, function(err) {
          if (err) {
            return pane.done(translateFilter('Error deleting document'), err);
          }
          $scope.deleteUser = null;
          $rootScope.$broadcast('UsersUpdated');
          pane.done();
        });
      };

    }
  ]);

}());