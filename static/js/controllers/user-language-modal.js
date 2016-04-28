  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('UserLanguageModal', ['$uibModal',
    function($uibModal) {
      return function(changeLanguageFunc, enabledLocales) {
        var modalInstance = $uibModal.open({
          templateUrl: 'templates/modals/user_language.html',
          controller: 'UserLanguageModalCtrl',
          resolve: {
            changeLanguageFunc: function () {
              return changeLanguageFunc;
            },
            enabledLocales: function () {
              return enabledLocales;
            }
          }
        });
        return modalInstance.result;
      };
    }
  ]);

/**
 * Controller for all modals. To create modals, do not use this directly, use the Modal service.
 */
// TODO instead of passing changeLanguageFunc, write a language service that we can inject.
angular.module('inboxControllers').controller('UserLanguageModalCtrl',
  ['changeLanguageFunc', 'enabledLocales', '$log', '$q', '$scope', 'Session', '$translate', '$uibModalInstance', 'UpdateUser',
  function(changeLanguageFunc, enabledLocales, $log, $q, $scope, Session, $translate, $uibModalInstance, UpdateUser) {
    $scope.enabledLocales = enabledLocales;

    $scope.processing = false;
    $scope.error = false;
    var initialLanguageCode = $translate.use();
    $scope.selectedLanguage = initialLanguageCode;

    $scope.changeLanguage = function(languageCode) {
      changeLanguageFunc(languageCode);
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
