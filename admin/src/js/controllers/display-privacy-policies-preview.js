angular
  .module('controllers')
  .controller('DisplayPrivacyPoliciesPreview', function(
    $log,
    $sce,
    $scope,
    $timeout,
    $uibModalInstance,
    PrivacyPolicies
  ) {
    'use strict';
    'ngInject';

    $scope.cancel = () =>$uibModalInstance.dismiss();

    if ($scope.model.attachment) {
      $scope.content = PrivacyPolicies.getTrustedHtml($scope.model.attachment.data);
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        $timeout(() => $scope.content = $sce.trustAsHtml(ev.target.result));
      };
      reader.onerror = ev => {
        $timeout(() => {
          $log.error('Error loading file contents', ev);
          $scope.status = { error: 'Error loading preview' };
        });
      };
      reader.readAsText($scope.model.file, 'utf-8');
    }

  });
