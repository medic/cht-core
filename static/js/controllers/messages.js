var _ = require('underscore'),
    ajaxDownload = require('../modules/ajax-download');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('MessagesCtrl', 
    ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', '$http', '$log', 'MessageContact', 'Changes', 'DownloadUrl',
    function ($scope, $rootScope, $state, $stateParams, $timeout, $http, $log, MessageContact, Changes, DownloadUrl) {

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

      var updateConversations = function(options, callback) {
        if (!options.changes) {
          $scope.loading = true;
        }
        MessageContact({ }, function(err, data) {
          if (err) {
            return $log.error('Error fetching contact', err);
          }
          $scope.loading = false;
          options.messages = data;
          setMessages(options);
          if (callback) {
            callback();
          }
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
      updateConversations({ }, function() {
        if (!$state.params.id &&
            $scope.messages.length &&
            !$scope.isMobile() &&
            $state.is('messages.detail')) {
          $timeout(function() {
            var id = $('.inbox-items li').first().attr('data-record-id');
            $state.go('messages.detail', { id: id }, { location: 'replace' });
          });
        }
      });

      $scope.$on('export', function() {
        if ($scope.currentTab === 'messages') {
          DownloadUrl(null, 'messages', function(err, url) {
            if (err) {
              return $log.error(err);
            }
            $http.post(url)
              .then(ajaxDownload.download)
              .catch(function(err) {
                $log.error('Error downloading', err);
              });
          });
        }
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
        $rootScope.$broadcast('TourStart', $stateParams.tour);
      }

    }
  ]);

}());
