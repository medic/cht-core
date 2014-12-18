var _ = require('underscore'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var findValue = function(locale, translation) {
    var result = _.findWhere(translation.translations, { locale: locale.code });
    return result && result.content;
  };

  var update = function(translations, model) {
    var populatedValues = _.filter(model.values, function(value) {
      return !!value.value;
    });
    var updated = _.findWhere(translations, { key: model.key });
    updated.translations = _.map(populatedValues, function(value) {
      return {
        locale: value.locale.code,
        content: value.value
      };
    });
  };

  inboxControllers.controller('EditTranslationCtrl',
    ['$scope', '$rootScope', '$timeout', 'translateFilter', 'Settings', 'UpdateSettings',
    function ($scope, $rootScope, $timeout, translateFilter, Settings, UpdateSettings) {
      $scope.$on('EditTranslationInit', function(e, translation, locales) {
        $scope.translationModel = { 
          key: translation.key,
          default: translation.default
        };
        $scope.translationModel.values = _.map(locales, function(locale) {
          return {
            locale: locale,
            value: findValue(locale, translation)
          };
        });
      });
      $scope.saveTranslation = function() {
        var pane = modal.start($('#edit-translation'));
        Settings(function(err, res) {
          if (err) {
            return pane.done(translateFilter('Error retrieving settings'), err);
          }
          var translations = _.clone(res.translations);
          update(translations, $scope.translationModel);
          UpdateSettings({ translations: translations }, function(err) {
            if (err) {
              return pane.done(translateFilter('Error saving settings'), err);
            }
            $rootScope.$broadcast('TranslationUpdated', { translations: translations });
            pane.done();
          });
        });
      };
    }
  ]);

}());