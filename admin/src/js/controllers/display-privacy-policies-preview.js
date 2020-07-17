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

    $scope.cancel = () =>$uibModalInstance.dismiss();

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

    if ($scope.model.attachment) {
      const utf8String = decodeUnicode($scope.model.attachment.data);
      $scope.content = $sce.trustAsHtml(utf8String);
    } else {
      const reader = new FileReader();
      reader.onload = ev => {
        $timeout(() => $scope.content = ev.target.result);

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
