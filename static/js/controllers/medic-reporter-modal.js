(function() {

  'use strict';

  angular.module('inboxControllers').controller('MedicReporterModalCtrl',
    function(
      $http,
      $q,
      $scope,
      $timeout,
      $uibModalInstance,
      Language,
      UserContact
    ) {
      'ngInject';

      $scope.setProcessing();

      var getUserPhoneNumber = function() {
        return UserContact()
          .then(function(contact) {
            return contact && contact.phone;
          });
      };

      var checkAuth = function(url) {
        return $http.head('/api/auth/' + encodeURIComponent(url));
      };

      var displayError = function(err) {
        var errorMessage = 'error.general.description';
        if (err.status === 403) {
          errorMessage = 'error.403.description';
        } else if (err.status === 404) {
          errorMessage = 'error.404.description';
        }
        $scope.setError(err, errorMessage);
      };

      var medicReporterFullUrl = function(baseUrl, formCode, language, phone) {
        var url = baseUrl +
          '?_embed_mode=1' + '&_show_forms=' + formCode;
        if (language) {
          url += '&_locale=' + language;
        }
        if (phone) {
          url += '&_gateway_num=' + phone;
        }
        return url;
      };

      var medicReporterBaseUrl = '/medic-reporter/_design/medic-reporter/_rewrite/';
      checkAuth(medicReporterBaseUrl)
        .then(function() {
          return $q.all([Language(), getUserPhoneNumber()]);
        })
        .then(function(results) {
          $scope.setFinished();
          $scope.medicReporterUrl =
              medicReporterFullUrl(medicReporterBaseUrl, $scope.model.formCode, results[0], results[1]);
        })
        .catch(displayError);

      $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
      };
    });
}());