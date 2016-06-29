(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationUsersCtrl',
    function (
      $log,
      $rootScope,
      $scope,
      $state,
      Users
    ) {

      'ngInject';

      $scope.updateList = function() {
        $scope.loading = true;
        Users()
          .then(function(users) {
            $scope.users = users;
            $scope.loading = false;
          })
          .catch(function(err) {
            $scope.error = true;
            $scope.loading = false;
            $log.error('Error fetching users', err);
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
  );

}());
