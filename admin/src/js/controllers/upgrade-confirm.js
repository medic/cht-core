angular.module('controllers').controller('UpgradeConfirmCtrl',
  function (
    $log,
    $scope,
    $translate,
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    $scope.status = { };

    $scope.cancel = () => {
      $uibModalInstance.dismiss();
    };

    $scope.submit = () => {
      if (!$scope.model || !$scope.model.confirmCallback) {
        return $uibModalInstance.close(true);
      }

      $scope.status.processing = true;
      return $scope.model
        .confirmCallback()
        .then(() => $uibModalInstance.close(true))
        .catch(err => {
          $log.error('Error when confirming', err);
          const key = $scope.model.errorKey || 'instance.upgrade.error.deploy';
          return $translate(key).then(msg => {
            $scope.status.error = msg;
            $scope.status.processing = false;
          });
        });
    };
  }
);
