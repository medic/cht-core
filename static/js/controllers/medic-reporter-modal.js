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
      Location,
      Settings,
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
        var formsListPath = '/' + Location.dbName + '/_design/medic/_rewrite/app_settings/medic-client/forms';
        var syncUrl = '/' + Location.dbName + '/_design/medic/_rewrite/add';
        var url = baseUrl +
          '?_embed_mode=1' +
          '&_show_forms=' + formCode +
          '&_forms_list_path=' + encodeURIComponent(formsListPath) +
          '&_sync_url=' + encodeURIComponent(syncUrl);
        if (language) {
          url += '&_locale=' + language;
        }
        if (phone) {
          url += '&_gateway_num=' + phone;
        }
        return url;
      };

      var medicReporterBaseUrl;
      Settings()
        .then(function(settings) {
          if (!settings.muvuku_webapp_url) {
            throw new Error({ status: 500, message: 'no medic-reporter url configured.' });
          } else {
            medicReporterBaseUrl = settings.muvuku_webapp_url.split('?').shift();
            // Needs trailing slash, otherwise breaks!!
            // https://github.com/medic/medic-reporter/issues/20
            if (medicReporterBaseUrl.substr(-1) !== '/') {
              medicReporterBaseUrl += '/';
            }
          }
          return medicReporterBaseUrl;
        }).then(checkAuth)
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