var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportTranslationCtrl',
    ['$scope', 'translateFilter', 'ImportProperties',
    function ($scope, translateFilter, ImportProperties) {

      $scope.$on('ImportTranslationInit', function(e, locale) {
        console.log(locale);
        $scope.locale = locale;
        $scope.translationFile = null;
      });

      $scope.import = function() {
        console.log($scope.locale, $scope.translationFile);
        var pane = modal.start($('#import-translation'));
        var file = $scope.translationFile && $scope.translationFile[0];
        if (!file) {
          // TODO translate, and style
          return pane.done('To be implemented', 'You must select a file');
        }
        var reader = new FileReader();
        reader.onload = function(event) {
          ImportProperties(event.target.result, $scope.locale.code, function(err) {
            // TODO translate
            pane.done('Error importing translations', err);
          });
        };
        reader.onerror = function(error) {
          // TODO translate
          return pane.done('Error reading properties file', error);
        };
        reader.readAsText(file);
      };

    }
  ]);

}());