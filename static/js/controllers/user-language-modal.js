/**
 * Note : this modal is really a full-fledged page, it does more than UI stuff (does the language changing).
 * It should eventually be a page.
 * https://github.com/medic/medic-webapp/issues/2254
 */
angular.module('inboxControllers').controller('UserLanguageModalCtrl',
  function(
    $log,
    $q,
    $scope,
    $uibModalInstance,
    Language,
    Languages,
    Session,
    SetLanguage,
    UpdateUser
  ) {

    'ngInject';
    'use strict';

    var initialLanguageCode;

    Languages().then(function(languages) {
      $scope.enabledLocales = languages;
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
      if (!$scope.selectedLanguage) {
        var err = new Error('No language selected');
        $log.error(err);
        return $q.reject(err);
      }
      $scope.setProcessing();
      return UpdateUser(Session.userCtx().name, { language: $scope.selectedLanguage })
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
