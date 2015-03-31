var tour = require('../modules/tour');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('MessagesCtrl', 
    ['$scope', '$state', '$location', '$stateParams', '$timeout', 'translateFilter', 'MessageContact', 'Changes',
    function ($scope, $state, $location, $stateParams, $timeout, translateFilter, MessageContact, Changes) {

      $scope.loadingContent = false;
      $scope.allLoaded = false;
      $scope.filterModel.type = 'messages';
      $scope.setMessages();

      var updateContacts = function(options, callback) {
        if (!options.changes) {
          $scope.loading = true;
        }
        MessageContact({ districtAdmin: $scope.permissions.districtAdmin }, function(err, data) {
          if (err) {
            return console.log('Error fetching contact', err);
          }
          $scope.loading = false;
          options.contacts = data;
          $scope.setMessages(options);
          if (callback) {
            callback();
          }
        });
      };

      updateContacts({}, function() {
        if ($scope.items.length && !$('#back').is(':visible')) {
          $timeout(function() {
            var id = $('.inbox-items li').first().attr('data-record-id');
            $state.go('messages.detail', { id: id });
          });
        }
      });

      Changes('messages-list', function(data) {
        if ($scope.filterModel.type === 'messages') {
          updateContacts({ changes: data });
        }
      });

      tour.start($stateParams.tour, translateFilter);
      $location.url($location.path());
    }
  ]);

}());