(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationUsersCtrl',
    ['$scope', '$rootScope', '$state', 'Users',
    function ($scope, $rootScope, $state, Users) {

      if (!$scope.permissions || !$scope.permissions.admin) {
        console.log('Insufficient permissions. Must be "admin".');
        $state.go('error', { code: 403 });
        return;
      }

      $scope.updateList = function() {
        Users(function(err, users) {
          if (err) {
            return console.log('Error fetching users', err);
          }
          $scope.users = users;
        });
      };

      $scope.deleteUserPrepare = function(user, $event) {
        $event.stopPropagation();
        $rootScope.$broadcast('DeleteUserInit', user);
        $('#delete-user-confirm').modal('show');
      };

      $scope.editUserPrepare = function(user) {
        $rootScope.$broadcast('EditUserInit', user);
      };

      $scope.$on('UsersUpdated', function() {
        $scope.updateList();
      });

      $scope.updateList();

    }
  ]);

}());