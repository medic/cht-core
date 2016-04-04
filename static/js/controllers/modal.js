angular.module('inboxControllers').controller('ModalCtrl', function ($scope, $uibModalInstance, input) {
  // Input passed to modal, for displaying on the template.
  $scope.input = input;

  $scope.ok = function () {
    $uibModalInstance.close('ok');
  };

  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});