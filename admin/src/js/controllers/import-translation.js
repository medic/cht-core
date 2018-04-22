angular.module('controllers').controller('ImportTranslationCtrl',
  function (
    $scope,
    $translate,
    $uibModalInstance,
    FileReader,
    ImportProperties
  ) {

    'use strict';
    'ngInject';
    
    $scope.locale = $scope.model;

    $scope.submit = function() {
      $scope.validationError = null;
      var file = $('#import-translation [name="translations"]').prop('files')[0];
      if (!file) {
        $translate('Translation file').then(function(fieldName) {
          $translate('field is required', { field: fieldName })
            .then(function(message) {
              $scope.validationError = message;
            });
        });
        return;
      }
      $scope.setProcessing();
      FileReader.utf8(file)
        .then(function(result) {
          return ImportProperties(result, $scope.locale);
        })
        .then(function() {
          $scope.setFinished();
          $uibModalInstance.close();
        })
        .catch(function(err) {
          $scope.setError(err, 'Error parsing file');
        });
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

  }
);
