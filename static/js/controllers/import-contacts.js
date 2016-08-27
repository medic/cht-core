var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportContactsCtrl',
    function (
      $scope,
      $translate,
      FileReader,
      ImportContacts
    ) {

      'ngInject';

      $scope.data = null;
      $scope.overwrite = false;

      var read = function(file, callback) {
        FileReader(file)
          .then(function(result) {
            try {
              return callback(null, JSON.parse(result));
            } catch(e) {
              return callback(e);
            }
          })
          .catch(callback);
      };

      $scope.save = function() {
        var pane = modal.start($('#import-contacts'));
        var file = $('#import-contacts [name="contacts"]').prop('files')[0];
        if (!file) {
          $translate('Contacts').then(function(fieldName) {
            $translate('field is required', { field: fieldName })
              .then(function(message) {
                pane.done(message, true);
              });
          });
          return;
        }
        read(file, function(err, contacts) {
          if (err) {
            $translate('Error parsing file').then(function(message) {
              pane.done(message, err);
            });
            return;
          }
          ImportContacts(contacts, $scope.overwrite)
            .then(function() {
              pane.done();
            })
            .catch(function(err) {
              $translate('Error parsing file').then(function(message) {
                pane.done(message, err);
              });
            });
        });
      };

    }
  );

}());