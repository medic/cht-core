var _ = require('underscore');

/**
 * Note : this modal is really a full-fledged page, it does more than UI stuff (does the language changing).
 * It should eventually be a page.
 * https://github.com/medic/medic-webapp/issues/2254
 */
angular.module('inboxControllers').controller('UserLanguageModalCtrl',
  function(
    $scope,
    $translate,
    $uibModalInstance,
    DB,
    Session,
    SetLanguage,
    UpdateUser
  ) {

    'ngInject';
    'use strict';

    DB()
      .query('medic-client/doc_by_type', { key: [ 'translations', true ] })
      .then(function(result) {
        $scope.enabledLocales = _.pluck(result.rows, 'value');
      });

    var initialLanguageCode = $translate.use();
    $scope.selectedLanguage = initialLanguageCode;

    $scope.changeLanguage = function(languageCode) {
      SetLanguage(languageCode);
      $scope.selectedLanguage = languageCode;
    };

    $scope.submit = function() {
      var newLanguage = $scope.selectedLanguage;
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
