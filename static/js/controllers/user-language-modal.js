var _ = require('underscore');
var inboxServices = angular.module('inboxServices');

// TODO : make a single modal service for all modals. https://github.com/medic/medic-webapp/issues/2253
inboxServices.factory('UserLanguageModal', ['$uibModal',
  function($uibModal) {
    return function() {
      var modalInstance = $uibModal.open({
        templateUrl: 'templates/modals/user_language.html',
        controller: 'UserLanguageModalCtrl',
      });
      return modalInstance.result;
    };
  }
]);

/**
 * Note : this modal is really a full-fledged page, it does more than UI stuff (does the language changing).
 * It should eventually be a page.
 * https://github.com/medic/medic-webapp/issues/2254
 */
angular.module('inboxControllers').controller('UserLanguageModalCtrl',
  ['$log', '$q', '$scope', 'Session', 'SetLanguage', 'Settings', '$translate', '$uibModalInstance', 'UpdateUser',
  function($log, $q, $scope, Session, SetLanguage, Settings, $translate, $uibModalInstance, UpdateUser) {
    Settings()
      .then(function(settings) {
        $scope.enabledLocales = _.reject(settings.locales, function(locale) {
          return !!locale.disabled;
        });
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
          _setErrorMode(err);
        });
    };

    var _setErrorMode = function(err) {
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
]);
