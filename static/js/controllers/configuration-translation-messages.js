var _ = require('underscore');

angular.module('inboxControllers').controller('ConfigurationTranslationMessagesCtrl',
  function (
    $log,
    $q,
    $scope,
    DB,
    Language,
    Modal,
    OutgoingMessagesConfiguration,
    Settings
  ) {

    'use strict';
    'ngInject';

    var findTranslation = function(locale, translations) {
      var value = _.findWhere(translations, { locale: locale });
      return value && value.content;
    };

    var createLanguageModel = function(language) {
      var rhs = _.find($scope.locales, function(current) {
        return current.code !== language;
      });
      return {
        lhs: language || 'en',
        rhs: rhs && rhs.code || 'en'
      };
    };

    var updateTranslationModels = function() {
      Settings()
        .then(function(settings) {
          var groupModels = OutgoingMessagesConfiguration(settings);
          $scope.groupModels = _.each(groupModels, function(group) {
            group.translations = _.map(group.translations, function(translation) {
              return {
                lhs: findTranslation($scope.localeModel.lhs, translation.translations),
                rhs: findTranslation($scope.localeModel.rhs, translation.translations),
                raw: translation
              };
            });
          });
        })
        .catch(function(err) {
          $log.error('Error loading settings', err);
        });
    };

    $q.all([
        DB().query('medic-client/doc_by_type', {
          startkey: [ 'translations', false ],
          endkey: [ 'translations', true ],
          include_docs: true
        }),
        Language()
      ])
      .then(function(results) {
        $scope.locales = _.pluck(results[0].rows, 'doc');
        $scope.localeModel = createLanguageModel(results[1]);
        updateTranslationModels();
        $scope.$watch('localeModel', function(curr, prev) {
          if (prev.lhs !== curr.lhs || prev.rhs !== curr.rhs) {
            updateTranslationModels();
          }
        }, true);
      })
      .catch(function(err) {
        $log.error('Error loading settings', err);
      });

    $scope.prepareEditTranslation = function(translation) {
      Modal({
        templateUrl: 'templates/modals/edit_translation_messages.html',
        controller: 'EditTranslationMessagesCtrl',
        model: {
          translation: translation,
          locales: $scope.locales
        }
      });
    };
  }
);
