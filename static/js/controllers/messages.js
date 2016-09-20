var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('MessagesCtrl', 
    function (
      $log,
      $scope,
      $state,
      $stateParams,
      $timeout,
      Changes,
      MessageContact,
      Tour
    ) {
      'ngInject';

      var removeDeletedMessages = function(messages) {
        var existingKey;
        var checkExisting = function(updated) {
          return existingKey === updated.key[0];
        };
        for (var i = $scope.messages.length - 1; i >= 0; i--) {
          existingKey = $scope.messages[i].key[0];
          if (!_.some(messages, checkExisting)) {
            $scope.messages.splice(i, 1);
          }
        }
      };

      var mergeUpdatedMessages = function(messages) {
        _.each(messages, function(updated) {
          var match = _.find($scope.messages, function(existing) {
            return existing.key[0] === updated.key[0];
          });
          if (match) {
            if (!_.isEqual(updated.value, match.value)) {
              match.value = updated.value;
            }
          } else {
            $scope.messages.push(updated);
          }
          if ($scope.selected && $scope.selected.id === updated.key[0]) {
            $scope.$broadcast('UpdateContactConversation', { silent: true});
          }
        });
      };

      var setMessages = function(options) {
        options = options || {};
        if (options.changes) {
          removeDeletedMessages(options.messages);
          mergeUpdatedMessages(options.messages);
        } else {
          $scope.messages = options.messages || [];
        }
      };

      var updateConversations = function(options) {
        if (!options.changes) {
          $scope.loading = true;
        }
        return MessageContact({})
          .then(function(data) {
            $scope.loading = false;
            options.messages = data;
            setMessages(options);
          });
      };

      $scope.setSelected = function(doc) {
        var refreshing = ($scope.selected && $scope.selected.id) === doc.id;
        $scope.selected = doc;
        $scope.settingSelected(refreshing);
      };

      $scope.allLoaded = false;
      $scope.messages = [];
      $scope.selected = null;
      setMessages();
      updateConversations({ })
        .then(function() {
          if (!$state.params.id &&
              $scope.messages.length &&
              !$scope.isMobile() &&
              $state.is('messages.detail')) {
            $timeout(function() {
              var id = $('.inbox-items li').first().attr('data-record-id');
              $state.go('messages.detail', { id: id }, { location: 'replace' });
            });
          }
        })
        .catch(function(err) {
          $log.error('Error fetching contact', err);
        });

      $scope.$on('ClearSelected', function() {
        $scope.selected = null;
      });

      Changes({
        key: 'messages-list',
        callback: function() {
          updateConversations({ changes: true });
        },
        filter: function(change) {
          if ($scope.currentTab !== 'messages') {
            return false;
          }
          return change.doc.kujua_message ||
                 change.doc.sms_message ||
                 change.deleted;
        }
      });

      if ($stateParams.tour) {
        Tour.start($stateParams.tour);
      }

    }
  );

}());
