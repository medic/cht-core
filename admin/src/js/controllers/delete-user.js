angular.module('controllers').controller('DeleteUserCtrl',
  function (
    $rootScope,
    $scope,
    $uibModalInstance,
    DeleteUser
  ) {

    'use strict';
    'ngInject';

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    $scope.submit = function() {
      $scope.setProcessing();
      DeleteUser($scope.model.name)
        .then(function() {
          $scope.setFinished();
          $rootScope.$broadcast('UsersUpdated');
          $uibModalInstance.close();
        })
        .catch(function(err) {
          $scope.setError(err, 'Error deleting document');
        });
    };

  });
