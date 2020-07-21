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

    $scope.cancel = () => $uibModalInstance.dismiss();

    const validateFileType = () => {
      const accept = 'text/html';
      if ($scope.model.attachment) {
        return $scope.model.attachment.content_type === accept;
      }
      if ($scope.model.file) {
        return $scope.model.file.type === accept;
      }
    };

    if (!validateFileType()) {
      $scope.status = { error: 'display.privacy.policies.preview.wrong.type' };
      return;
    }

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
          $scope.status = { error: 'display.privacy.policies.preview.error' };
        });
      };
      reader.readAsText($scope.model.file, 'utf-8');
    }

  });
