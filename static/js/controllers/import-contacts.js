var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ImportContactsCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'ImportContacts',
    function ($scope, $rootScope, translateFilter, ImportContacts) {

      $scope.data = null;
      $scope.overwrite = false;

      $scope.save = function() {
        var pane = modal.start($('#import-contacts'));
        var file = $scope.data && $scope.data[0];
        if (!file) {
          return pane.done(translateFilter('field is required', {
            field: translateFilter('Contacts')
          }), true);
        }
        var reader = new FileReader();
        reader.onload = function(event) {
          var contacts;
          try {
            contacts = JSON.parse(event.target.result);
          } catch(e) {
            return pane.done(translateFilter('Error parsing file'), e);
          }
          ImportContacts(contacts, $scope.overwrite, function(err) {
            pane.done(translateFilter('Error parsing file'), err);
            $rootScope.$broadcast('ContactUpdated');
          });
        };
        reader.onerror = function(err) {
          return pane.done(translateFilter('Error parsing file'), err);
        };
        reader.readAsText(file);
      };

    }
  ]);

}());