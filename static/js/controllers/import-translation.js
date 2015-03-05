var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportTranslationCtrl',
    ['$scope', 'translateFilter', 'ImportProperties',
    function ($scope, translateFilter, ImportProperties) {

      $scope.$on('ImportTranslationInit', function(e, locale) {
        $scope.locale = locale;
        $scope.translationFile = null;
      });

      var read = function(file, callback) {
        var reader = new FileReader();
        reader.onload = function(event) {
          callback(null, event.target.result);
        };
        reader.onerror = callback;
        reader.readAsText(file);
      };

      $scope.import = function() {
        var pane = modal.start($('#import-translation'));
        var file = $scope.translationFile && $scope.translationFile[0];
        if (!file) {
          return pane.done(translateFilter('field is required', {
            field: translateFilter('Translation file')
          }), true);
        }
        read(file, function(err, result) {
          if (err) {
            return pane.done(translateFilter('Error parsing file'), err);
          }
          ImportProperties(result, $scope.locale.code, function(err) {
            pane.done(translateFilter('Error parsing file'), err);
          });
        });
      };

    }
  ]);

}());