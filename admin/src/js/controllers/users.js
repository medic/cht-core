const _ = require('lodash/core');

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
      const params = { include_docs: true, key: ['user-settings'] };
      DB().query('medic-client/doc_by_type', params)
        .then(function(settings) {
          $scope.users = _.map(settings.rows, 'doc');
          $scope.loading = false;
          prepareUsers();
        })
        .catch(function(err) {
          $scope.error = true;
          $scope.loading = false;
          $log.error('Error fetching users', err);
        });
    };

    const prepareUsers = () => {
      const placesIds = $scope.users.map(user => user.facility_id);
      return DB().allDocs({ keys: placesIds, include_docs: true }).then(result => {
        result.rows.forEach((row, idx) => $scope.users[idx].facility = row.doc);
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
