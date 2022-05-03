angular.module('controllers').controller('MultipleUserCtrl', function(
  $scope,
  $uibModalInstance,
  Modal,
  $window) {
  'use strict';
  $scope.displayAddMultipleModal = true;
  $scope.displayUnavailableModal = false;
  $scope.displayUploadConfirm = true;
  $scope.displayProcessingStatus = false;
  $scope.displayFinishSummary = false;

  $scope.onCancel = function () {
    $scope.clearScreen();
    $uibModalInstance.dismiss();
  };

  $scope.processUpload = function () {
    $scope.clearScreen();
    $scope.displayProcessingStatus = true;
  };

  $scope.showFinishSummary = function () {
    $scope.clearScreen();
    $scope.displayProcessingStatus = false;
    $scope.displayFinishSummary = true;
    Modal({
      templateUrl: 'templates/multiple_user_fullscreen.html',
      controller: 'MultipleUserCtrl',
      model: {}
    });
  };

  $scope.backToAppManagement = function () {
    $scope.clearScreen();
    $uibModalInstance.dismiss();
  };

  $scope.clearScreen = function () {
    $scope.displayAddMultipleModal = false;
    $scope.displayUnavailableModal = false;
    $scope.displayUploadConfirm = false;
    $scope.displayProcessingStatus = false;
    $scope.displayFinishSummary = false;
  };
}
);
