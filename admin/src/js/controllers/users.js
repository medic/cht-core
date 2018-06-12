var _ = require('underscore');

angular.module('controllers').controller('UsersCtrl',
  function (
    $log,
    $scope,
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
        templateUrl: 'templates/delete_user_confirm.html',
        controller: 'DeleteUserCtrl',
        model: user
      });
    };

    $scope.editUser = function(user) {
      Modal({
        templateUrl: 'templates/edit_user.html',
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
