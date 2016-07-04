(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationUsersCtrl',
    function (
      $log,
      $rootScope,
      $scope,
      DbView,
      Modal
    ) {

      'ngInject';

      $scope.updateList = function() {
        $scope.loading = true;
        var params = { include_docs: true, key: ['user-settings'] };
        DbView('doc_by_type', { params: params })
          .then(function(settings) {
            $scope.users = settings.results;
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

      $scope.editUser = function(user) {
        Modal({
          templateUrl: 'templates/modals/edit_user.html',
          controller: 'EditUserCtrl',
          args: {
            processingFunction: null,
            model: user
          }
        })
        .catch(function(err) {
          $log.debug('User cancelled edit user.', err);
        });
      };

      $scope.$on('UsersUpdated', function() {
        $scope.updateList();
      });

      $scope.updateList();

    }
  );

}());
