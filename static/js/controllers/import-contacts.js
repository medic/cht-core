var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportContactsCtrl',
    ['$scope', 'translateFilter', 'ImportContacts', 'FileReader',
    function ($scope, translateFilter, ImportContacts, FileReader) {

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
          return pane.done(translateFilter('field is required', {
            field: translateFilter('Contacts')
          }), true);
        }
        read(file, function(err, contacts) {
          if (err) {
            return pane.done(translateFilter('Error parsing file'), err);
          }
          ImportContacts(contacts, $scope.overwrite)
            .then(function() {
              pane.done();
            })
            .catch(function(err) {
              pane.done(translateFilter('Error parsing file'), err);
            });
        });
      };

    }
  ]);

}());