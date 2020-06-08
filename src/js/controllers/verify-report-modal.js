angular.module('inboxControllers').controller('VerifyReportModalCtrl', function(
  $scope,
  $uibModalInstance
) {
  'ngInject';
  'use strict';

  $scope.submit = () => $uibModalInstance.close();
  $scope.cancel = () => $uibModalInstance.dismiss();
});
