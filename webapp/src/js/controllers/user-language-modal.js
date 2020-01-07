/**
 * Note : this modal is really a full-fledged page, it does more than UI stuff (does the language changing).
 * It should eventually be a page.
 * https://github.com/medic/medic/issues/2254
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

    const ctrl = this;
    let initialLanguageCode;

    Languages().then(function(languages) {
      ctrl.enabledLocales = languages;
    });

    Language()
      .then(function(language) {
        initialLanguageCode = language;
        if (!ctrl.selectedLanguage) {
          ctrl.selectedLanguage = language;
        }
      })
      .catch(function(err) {
        $log.error('Error loading language', err);
      });

    ctrl.changeLanguage = function(languageCode) {
      if (languageCode) {
        SetLanguage(languageCode);
        ctrl.selectedLanguage = languageCode;
      }
    };

    ctrl.submit = function() {
      if (!ctrl.selectedLanguage) {
        const err = new Error('No language selected');
        $log.error(err);
        return $q.reject(err);
      }
      $scope.setProcessing();
      return UpdateUser(Session.userCtx().name, { language: ctrl.selectedLanguage })
        .then(function() {
          $scope.setFinished();
          $uibModalInstance.close();
        })
        .catch(function(err) {
          // Reset to initial language.
          ctrl.changeLanguage(initialLanguageCode);
          $scope.setError(err, 'Error updating user');
        });
    };

    ctrl.cancel = function() {
      // Reset to initial language.
      ctrl.changeLanguage(initialLanguageCode);
      $uibModalInstance.dismiss();
    };
  }
);
