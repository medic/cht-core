var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportContactsCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'ImportContacts', 'FileReader',
    function ($scope, $rootScope, translateFilter, ImportContacts, FileReader) {

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
        var file = $scope.data && $scope.data[0];
        if (!file) {
          return pane.done(translateFilter('field is required', {
            field: translateFilter('Contacts')
          }), true);
        }
        read(file, function(err, contacts) {
          if (err) {
            return pane.done(translateFilter('Error parsing file'), err);
          }
          ImportContacts(contacts, $scope.overwrite, function(err) {
            pane.done(translateFilter('Error parsing file'), err);
            $rootScope.$broadcast('ContactUpdated');
          });
        });
      };

    }
  ]);

}());