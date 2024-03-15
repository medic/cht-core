angular.module('controllers').controller('ExportContactsCtrl',
  function (
    $log,
    $scope,
    $translate,
    Export,
    FileReader,
    ImportContacts,
    JsonParse,
    Translate
  ) {

    'use strict';
    'ngInject';

    $scope.data = null;
    $scope.overwrite = false;

    $scope.export = function() {
      if ($scope.exporting) {
        return;
      }

      $scope.exporting = true;
      Export('contacts', {}, { humanReadable: true })
        .finally(() => {
          $scope.exporting = false;
          $scope.$apply();
        });
    };

    $scope.import = function() {
      const file = $('#import-contacts [name="contacts"]').prop('files')[0];
      if (!file) {
        Translate.fieldIsRequired('Contacts')
          .then(function(message) {
            $scope.error = message;
          });
        return;
      }
      $scope.error = false;
      $scope.importing = true;
      FileReader.utf8(file)
        .then(JsonParse)
        .then(function(contacts) {
          return ImportContacts(contacts, $scope.overwrite);
        })
        .then(function() {
          $scope.importing = false;
        })
        .catch(function(err) {
          $scope.importing = false;
          $log.error('Error importing contacts', err);
          $translate('Error parsing file').then(function(message) {
            $scope.error = message;
          });
        });
    };

  });
