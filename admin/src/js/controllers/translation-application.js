var _ = require('underscore');

var TRANSLATION_KEYS_OPTION = { doc: {code: 'keys', name: 'Translation Keys'} };
var DEFAULT_LANGUAGE = 'en';

angular.module('controllers').controller('TranslationApplicationCtrl',
  function (
    $log,
    $scope,
    DB,
    Modal
  ) {

    'use strict';
    'ngInject';

    var updateLocaleModel = function(language) {
      var rhs = _.find($scope.translations, function(translation) {
        return translation.doc.code !== language;
      });
      $scope.localeModel = {
        lhs: language || DEFAULT_LANGUAGE,
        rhs: rhs && rhs.doc.code || DEFAULT_LANGUAGE
      };
    };

    var findTranslation = function(locale) {
      var translation = _.find($scope.translations, function(translation) {
        return translation.doc.code === locale;
      });
      return translation && translation.doc;
    };

    var updateTranslationModels = function() {
      var showKeys = $scope.localeModel.lhs === TRANSLATION_KEYS_OPTION.doc.code;
      var lhsOption =  showKeys ? DEFAULT_LANGUAGE : $scope.localeModel.lhs;
      var lhsTranslation = findTranslation(lhsOption);
      var rhsTranslation = findTranslation($scope.localeModel.rhs);
      var lhs = (lhsTranslation && lhsTranslation.values) || {};
      var rhs = (rhsTranslation && rhsTranslation.values) || {};
      $scope.translationModels = Object.keys(lhs).map(function(key) {
        return {
          key: key,
          lhs: showKeys ? key : lhs[key],
          rhs: rhs[key]
        };
      });
    };

    var updateTranslations = function() {
      return DB()
        .query('medic-client/doc_by_type', {
          startkey: [ 'translations', false ],
          endkey: [ 'translations', true ],
          include_docs: true
        })
        .then(function(results) {
          $scope.translations = results.rows;
          $scope.translationOptions = _.union([TRANSLATION_KEYS_OPTION], $scope.translations);
        })
        .catch(function(err) {
          $log.error('Error fetching translation documents', err);
        });
    };

    updateTranslations()
      .then(function() {
        updateLocaleModel('en');
        updateTranslationModels();
        $scope.$watch('localeModel', function(curr, prev) {
          if (prev.lhs !== curr.lhs || prev.rhs !== curr.rhs) {
            updateTranslationModels();
          }
        }, true);
      });

    $scope.editTranslation = function(key) {
      Modal({
        templateUrl: 'templates/edit_translation.html',
        controller: 'EditTranslationCtrl',
        model: {
          key: key,
          locales: _.values($scope.translations)
        }
      });
    };

  }
);
