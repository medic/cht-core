var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationUsersCtrl',
    function (
      $log,
      $scope,
      DB,
      Modal
    ) {

      'ngInject';

      $scope.updateList = function() {
        $scope.loading = true;
        var params = { include_docs: true, key: ['user-settings'] };
        DB().query('medic-client/doc_by_type', params)
          .then(function(settings) {
            $scope.users = _.pluck(settings.rows, 'doc');
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
        Modal({
          templateUrl: 'templates/modals/delete_user_confirm.html',
          controller: 'DeleteUserCtrl',
          model: user
        });
      };

      $scope.editUser = function(user) {
        Modal({
          templateUrl: 'templates/modals/edit_user.html',
          controller: 'EditUserCtrl',
          model: user
        });
      };

      $scope.$on('UsersUpdated', function() {
        $scope.updateList();
      });

      $scope.updateList();

    }
  );

}());
