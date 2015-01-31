(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationUsersCtrl',
    ['$scope', '$rootScope', 'Users',
    function ($scope, $rootScope, Users) {

      $scope.updateList = function() {
        Users(function(err, users) {
          if (err) {
            return console.log('Error fetching users', err);
          }
          $scope.users = users;
        });
      };

      $scope.deleteUserPrepare = function(user) {
        $rootScope.$broadcast('DeleteUserInit', user);
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