var _ = require('underscore');

/**
 * Note : this modal is really a full-fledged page, it does more than UI stuff (does the language changing).
 * It should eventually be a page.
 * https://github.com/medic/medic-webapp/issues/2254
 */
angular.module('inboxControllers').controller('UserLanguageModalCtrl',
  function(
    $log,
    $scope,
    $uibModalInstance,
    DB,
    Language,
    Session,
    SetLanguage,
    UpdateUser
  ) {

    'ngInject';
    'use strict';

    var initialLanguageCode;

    DB()
      .query('medic-client/doc_by_type', { key: [ 'translations', true ] })
      .then(function(result) {
        $scope.enabledLocales = _.pluck(result.rows, 'value');
      });

    Language()
      .then(function(language) {
        initialLanguageCode = language;
        if (!$scope.selectedLanguage) {
          $scope.selectedLanguage = language;
        }
      })
      .catch(function(err) {
        $log.error('Error loading language', err);
      });

    $scope.changeLanguage = function(languageCode) {
      if (languageCode) {
        SetLanguage(languageCode);
        $scope.selectedLanguage = languageCode;
      }
    };

    $scope.submit = function() {
      var newLanguage = $scope.selectedLanguage;
      if (!newLanguage) {
        return $uibModalInstance.close();
      }
      var id = 'org.couchdb.user:' + Session.userCtx().name;
      $scope.setProcessing();
      return UpdateUser(id, { language: newLanguage })
        .then(function() {
          $scope.setFinished();
          $uibModalInstance.close();
        })
        .catch(function(err) {
          // Reset to initial language.
          $scope.changeLanguage(initialLanguageCode);
          $scope.setError(err, 'Error updating user');
        });
    };

    $scope.cancel = function() {
      // Reset to initial language.
      $scope.changeLanguage(initialLanguageCode);
      $uibModalInstance.dismiss();
    };
  }
);
