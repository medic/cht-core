var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportTranslationCtrl',
    function (
      $scope,
      $translate,
      $uibModalInstance,
      FileReader,
      ImportProperties,
      model
    ) {

      'ngInject';
      
      $scope.locale = model;

      $scope.import = function() {
        var pane = modal.start($('#import-translation'));
        var file = $('#import-translation [name="translations"]').prop('files')[0];
        if (!file) {
          $translate('Translation file').then(function(fieldName) {
            $translate('field is required', { field: fieldName })
              .then(function(message) {
                pane.done(message, true);
              });
          });
          return;
        }
        FileReader(file)
          .then(function(result) {
            return ImportProperties(result, $scope.locale);
          })
          .then(function() {
            pane.done();
            $uibModalInstance.close('ok');
          })
          .catch(function(err) {
            $translate('Error parsing file').then(function(message) {
              pane.done(message, err);
            });
          });
      };

      $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
      };

    }
  );

}());