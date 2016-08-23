angular.module('inboxControllers').controller('DeleteUserCtrl',
  function (
    $rootScope,
    $scope,
    $translate,
    $uibModalInstance,
    DeleteUser,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    $scope.submit = function() {
      $scope.setProcessing();
      DeleteUser($scope.model)
        .then(function() {
          $scope.setFinished();
          $rootScope.$broadcast('UsersUpdated');
          $translate('document.deleted').then(Snackbar);
          $uibModalInstance.close();
        })
        .catch(function(err) {
          $scope.setError(err, 'Error deleting document');
        });
    };

  }
);
