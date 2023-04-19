const _ = require('lodash/core');

angular.module('controllers').controller('UsersCtrl',
  function (
    $log,
    $scope,
    $state,
    DB,
    Modal,
    Settings
  ) {

    'use strict';
    'ngInject';

    Settings()
      .then(function(settings) {
        $scope.roles = settings.roles;
      })
      .catch(function(err) {
        $log.error('Error fetching settings', err);
      });

    $scope.updateList = function() {
      $scope.loading = true;
      const params = { include_docs: true, key: ['user-settings'] };
      DB().query('medic-client/doc_by_type', params)
        .then(function(settings) {
          $scope.users = _.map(settings.rows, 'doc');
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
        templateUrl: 'templates/delete_user_confirm.html',
        controller: 'DeleteUserCtrl',
        model: user
      });
    };

    $scope.editUser = function(user) {
      $state.go('edit-user', { user: user, name: user.name });
    };

    $scope.showAddMultipleUsersModal = function() {
      Modal({
        templateUrl: 'templates/multiple_user_modal.html',
        controller: 'MultipleUserCtrl',
        model: {},
      });
    };

    $scope.$on('UsersUpdated', function() {
      $scope.updateList();
    });

    $scope.updateList();

  }
);
