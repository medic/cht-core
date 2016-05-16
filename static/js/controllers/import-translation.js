var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportTranslationCtrl',
    function (
      $scope,
      $translate,
      FileReader,
      ImportProperties
    ) {

      'ngInject';

      $scope.$on('ImportTranslationInit', function(e, locale) {
        $scope.locale = locale;
        $scope.translationFile = null;
      });

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
            ImportProperties(result, $scope.locale.code, function(err) {
              if (err) {
                $translate('Error parsing file').then(function(message) {
                  pane.done(message, err);
                });
                return;
              }
              pane.done();
            });
          })
          .catch(function(err) {
            $translate('Error parsing file').then(function(message) {
              pane.done(message, err);
            });
          });
      };

    }
  );

}());