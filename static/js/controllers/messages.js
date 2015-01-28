var tour = require('../modules/tour');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('MessagesCtrl', 
    ['$scope', '$state', '$location', '$stateParams', 'translateFilter', 'MessageContact', 'Changes',
    function ($scope, $state, $location, $stateParams, translateFilter, MessageContact, Changes) {

      $scope.loadingContent = false;
      $scope.allLoaded = false;
      $scope.filterModel.type = 'messages';

      var updateContacts = function(options) {
        options = options || {};
        MessageContact({ districtAdmin: $scope.permissions.districtAdmin }, function(err, data) {
          if (err) {
            return console.log('Error fetching contact', err);
          }
          options.contacts = data;
          $scope.setContacts(options);
          if (data.length && !$('#back').is(':visible')) {
            window.setTimeout(function() {
              var id = $('.inbox-items li').first().attr('data-record-id');
              $state.go('messages.detail', { id: id });
            }, 1);
          }
        });
      };

      updateContacts();

      Changes('messages-list', function(data) {
        updateContacts({ changes: data });
      });

      tour.start($stateParams.tour, translateFilter);
      $location.url($location.path());
    }
  ]);

}());