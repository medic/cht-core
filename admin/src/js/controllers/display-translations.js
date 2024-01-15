const _ = require('lodash/core');
_.union = require('lodash/union');

const TRANSLATION_KEYS_OPTION = { doc: {code: 'keys', name: 'Translation Keys'} };
const DEFAULT_LANGUAGE = 'en';

angular.module('controllers').controller('DisplayTranslationsCtrl',
  function (
    $log,
    $scope,
    DB,
    Modal
  ) {

    'use strict';
    'ngInject';

    const updateLocaleModel = function(language) {
      const rhs = _.find($scope.translations, function(translation) {
        return translation.doc.code !== language;
      });
      $scope.localeModel = {
        lhs: language || DEFAULT_LANGUAGE,
        rhs: rhs && rhs.doc.code || DEFAULT_LANGUAGE
      };
    };

    const findTranslation = function(locale) {
      const translation = _.find($scope.translations, function(translation) {
        return translation.doc.code === locale;
      });
      return translation && translation.doc;
    };

    const updateTranslationModels = function() {
      const showKeys = $scope.localeModel.lhs === TRANSLATION_KEYS_OPTION.doc.code;
      const lhsOption =  showKeys ? DEFAULT_LANGUAGE : $scope.localeModel.lhs;
      const lhsTranslation = findTranslation(lhsOption);
      const rhsTranslation = findTranslation($scope.localeModel.rhs);
      const lhs = (
        lhsTranslation && Object.assign(Object.assign({}, lhsTranslation.generic), lhsTranslation.custom || {})
      );
      const rhs = (
        rhsTranslation && Object.assign(Object.assign({}, rhsTranslation.generic), rhsTranslation.custom || {})
      );
      $scope.translationModels = Object.keys(lhs).map(function(key) {
        return {
          key: key,
          lhs: showKeys ? key : lhs[key],
          rhs: rhs[key]
        };
      });
    };

    const updateTranslations = function() {
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
        .then(function() {
          updateLocaleModel('en');
          updateTranslationModels();
          $scope.$watch('localeModel', function(curr, prev) {
            if (prev.lhs !== curr.lhs || prev.rhs !== curr.rhs) {
              updateTranslationModels();
            }
          }, true);
        })
        .catch(function(err) {
          $log.error('Error fetching translation documents', err);
        });
    };


    updateTranslations();

    $scope.editTranslation = function(key) {
      Modal({
        templateUrl: 'templates/edit_translation.html',
        controller: 'EditTranslationCtrl',
        model: {
          key: key,
          locales: _.values($scope.translations)
        }
      }).then(function(){
        updateTranslations();
      });
    };

  });
