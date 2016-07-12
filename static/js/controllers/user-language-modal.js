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
    $translate,
    $uibModalInstance,
    DB,
    Session,
    SetLanguage,
    UpdateUser
  ) {

    'ngInject';

    DB()
      .query('medic-client/doc_by_type', { key: [ 'translations', true ] })
      .then(function(result) {
        $scope.enabledLocales = _.pluck(result.rows, 'value');
      });

    $scope.processing = false;
    $scope.error = false;
    var initialLanguageCode = $translate.use();
    $scope.selectedLanguage = initialLanguageCode;

    $scope.changeLanguage = function(languageCode) {
      SetLanguage(languageCode);
      $scope.selectedLanguage = languageCode;
    };

    $scope.ok = function() {
      var newLanguage = $scope.selectedLanguage;
      var id = 'org.couchdb.user:' + Session.userCtx().name;
      $scope.processing = true;
      $scope.error = false;

      return UpdateUser(id, { language: newLanguage })
        .then(function() {
          return $uibModalInstance.close($scope.selectedLanguage);
        })
        .catch(function(err) {
          // Reset to initial language.
          $scope.changeLanguage(initialLanguageCode);
          setErrorMode(err);
        });
    };

    var setErrorMode = function(err) {
      $log.error('Error in modal', err);
      $scope.processing = false;
      $scope.error = true;
    };

    $scope.cancel = function() {
      // Reset to initial language.
      $scope.changeLanguage(initialLanguageCode);
      $uibModalInstance.dismiss('cancel');
    };
  }
);
