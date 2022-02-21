angular.module('controllers').controller('UpgradeConfirmCtrl',
  function (
    $scope,
    $uibModalInstance
  ) {

    'use strict';
    'ngInject';

    $scope.status = { };

    $scope.cancel = () => {
      $uibModalInstance.dismiss();
    };

    $scope.submit = () => {
      if ($scope.model && $scope.model.confirmCallback) {
        $scope.status.processing = true;
        return $scope.model
          .confirmCallback()
          .then(() => $uibModalInstance.close(true));
      }

      $uibModalInstance.close(true);
    };
  }
);
