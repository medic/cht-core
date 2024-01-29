angular.module('controllers').controller('ImportTranslationCtrl',
  function (
    $scope,
    $uibModalInstance,
    FileReader,
    ImportProperties,
    Translate
  ) {

    'use strict';
    'ngInject';
    
    $scope.locale = $scope.model;

    $scope.submit = function() {
      $scope.validationError = null;
      const file = $('#import-translation [name="translations"]').prop('files')[0];
      if (!file) {
        Translate.fieldIsRequired('Translation file')
          .then(function(message) {
            $scope.validationError = message;
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

  });
