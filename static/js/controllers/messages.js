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

      var updateContacts = function(options, callback) {
        options = options || {};
        MessageContact({ districtAdmin: $scope.permissions.districtAdmin }, function(err, data) {
          if (err) {
            return console.log('Error fetching contact', err);
          }
          options.contacts = data;
          $scope.setContacts(options);
          if (callback) {
            callback();
          }
        });
      };

      updateContacts({}, function() {
        if ($scope.messages.length && !$('#back').is(':visible')) {
          $timeout(function() {
            var id = $('.inbox-items li').first().attr('data-record-id');
            $state.go('messages.detail', { id: id });
          });
        }
      });

      Changes('messages-list', function(data) {
        updateContacts({ changes: data });
      });

      tour.start($stateParams.tour, translateFilter);
      $location.url($location.path());
    }
  ]);

}());