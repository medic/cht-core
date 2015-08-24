(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('MessagesCtrl', 
    ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', 'MessageContact', 'Changes',
    function ($scope, $rootScope, $state, $stateParams, $timeout, MessageContact, Changes) {

      $scope.loadingContent = false;
      $scope.allLoaded = false;
      $scope.filterModel.type = 'messages';
      $scope.setMessages();

      var updateContacts = function(options, callback) {
        if (!options.changes) {
          $scope.loading = true;
        }
        MessageContact({ }, function(err, data) {
          if (err) {
            return console.log('Error fetching contact', err);
          }
          $scope.loading = false;
          options.messages = data;
          $scope.setMessages(options);
          if (callback) {
            callback();
          }
        });
      };

      updateContacts({ }, function() {
        if (!$state.params.id && $scope.items.length && !$('#back').is(':visible')) {
          $timeout(function() {
            var id = $('.inbox-items li').first().attr('data-record-id');
            $state.go('messages.detail', { id: id });
          });
        }
      });

      Changes({
        key: 'messages-list',
        callback: function() {
          updateContacts({ changes: true });
        },
        filter: function(change) {
          if ($scope.filterModel.type !== 'messages') {
            return false;
          }
          if (change.newDoc) {
            return change.newDoc.kujua_message || change.newDoc.sms_message;
          }
          return _.findWhere($scope.items, { _id: change.id });
        }
      });

      if ($stateParams.tour) {
        $rootScope.$broadcast('TourStart', $stateParams.tour);
      }

    }
  ]);

}());
