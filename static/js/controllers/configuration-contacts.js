angular.module('inboxControllers').controller('ConfigurationContactsCtrl',
  function (
    $log,
    $scope,
    $translate,
    Export,
    FileReader,
    ImportContacts,
    JsonParse
  ) {

    'use strict';
    'ngInject';

    $scope.data = null;
    $scope.overwrite = false;

    $scope.export = function() {
      Export({}, 'contacts');
    };

    $scope.import = function() {
      var file = $('#import-contacts [name="contacts"]').prop('files')[0];
      if (!file) {
        $translate('Contacts').then(function(fieldName) {
          $translate('field is required', { field: fieldName }).then(function(message) {
            $scope.error = message;
          });
        });
        return;
      }
      $scope.error = false;
      $scope.importing = true;
      FileReader(file)
        .then(JsonParse)
        .then(function(contacts) {
          return ImportContacts(contacts, $scope.overwrite);
        })
        .catch(function(err) {
          $log.error('Error importing contacts', err);
          $translate('Error parsing file').then(function(message) {
            $scope.error = message;
          });
        })
        .then(function() {
          $scope.importing = false;
        });
    };

  }
);
