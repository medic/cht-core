var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportTranslationCtrl',
    ['$scope', 'translateFilter', 'ImportProperties', 'FileReader',
    function ($scope, translateFilter, ImportProperties, FileReader) {

      $scope.$on('ImportTranslationInit', function(e, locale) {
        $scope.locale = locale;
        $scope.translationFile = null;
      });

      $scope.import = function() {
        var pane = modal.start($('#import-translation'));
        var file = $scope.translationFile && $scope.translationFile[0];
        if (!file) {
          return pane.done(translateFilter('field is required', {
            field: translateFilter('Translation file')
          }), true);
        }
        FileReader(file)
          .then(function(result) {
            ImportProperties(result, $scope.locale.code, function(err) {
              pane.done(translateFilter('Error parsing file'), err);
            });
          })
          .catch(function(err) {
            pane.done(translateFilter('Error parsing file'), err);
          });
      };

    }
  ]);

}());