var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportContactsCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'ImportContacts',
    function ($scope, $rootScope, translateFilter, ImportContacts) {

      $scope.data = null;
      $scope.overwrite = false;

      var read = function(file, callback) {
        var reader = new FileReader();
        reader.onload = function(event) {
          try {
            return callback(null, JSON.parse(event.target.result));
          } catch(e) {
            return callback(e);
          }
        };
        reader.onerror = callback;
        reader.readAsText(file);
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