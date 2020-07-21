angular
  .module('controllers')
  .controller('DisplayPrivacyPoliciesPreview', function(
    $log,
    $sce,
    $scope,
    $timeout,
    $uibModalInstance
  ) {
    'use strict';
    'ngInject';

    // atob doesn't handle unicode characters
    // stolen from StackOverflow
    const decodeUnicode = string => {
      // Going backwards: from byte stream, to percent-encoding, to original string.
      const unicodeCharArray = atob(string)
        .split('')
        .map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
        .join('');
      return decodeURIComponent(unicodeCharArray);
    };

    const getTrustedHtml = string => {
      return $sce.trustAsHtml(decodeUnicode(string));
    };

    $scope.cancel = () =>$uibModalInstance.dismiss();

    if ($scope.model.attachment) {
      $scope.content = getTrustedHtml($scope.model.attachment.data);
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
