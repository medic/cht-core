var _ = require('underscore'),
    sendMessage = require('../modules/send-message');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('MessagesCtrl', 
    ['$scope', '$route', '$animate', 'MessageContact', 'ContactConversation', 'MarkAllRead', 'UserDistrict', 'Changes', 'RememberService',
    function ($scope, $route, $animate, MessageContact, ContactConversation, MarkAllRead, UserDistrict, Changes, RememberService) {

      $scope.loadingContent = false;
      $scope.allLoaded = false;

      var markAllRead = function() {
        var docs = _.pluck($scope.selected.messages, 'doc');
        MarkAllRead(docs, true, function(err) {
          if (err) {
            console.log('Error marking all as read', err);
          }
          $scope.updateReadStatus();
        });
      };

      var placeUnreadMarker = function() {
        var content = $('.item-content');
        var firstUnread = content.find('.body .unread').filter(':first');
        var scrollTo;
        if (firstUnread.length) {
          firstUnread.before('<li id="unread-marker" class="marker">Unread below</li>');
          scrollTo = $('#unread-marker').offset().top - 150;
        } else {
          scrollTo = content[0].scrollHeight;
        }
        content.scrollTop(scrollTo);
        $('#message-content').on('scroll', _checkScroll);
      };

      var updateRead = function() {
        placeUnreadMarker();
        markAllRead();
      };

      var findMostRecentFacility = function(messages) {
        var message = _.find(messages, function(message) {
          return message.value.facility;
        });
        if (message) {
          return [{ doc: message.value.facility }];
        }
        message = _.find(messages, function(message) {
          return message.value.name;
        });
        if (message) {
          return [{ doc: { contact: { phone: message.value.name } } }];
        }
        return [];
      };

      var selectContact = function(district, id) {
        if (!id) {
          $scope.error = false;
          $scope.loadingContent = false;
          $scope.setSelected();
          return;
        }
        $('#message-content').off('scroll', _checkScroll);
        $scope.loadingContent = true;
        $scope.setSelected({ id: id });
        ContactConversation(district, id, null, function(err, data) {
          if (err) {
            $scope.loadingContent = false;
            $scope.error = true;
            console.log(err);
            return;
          }
          if ($scope.selected && $scope.selected.id !== id) {
            // ignore response for previous request
            return;
          }
          var facility = findMostRecentFacility(data.rows);
          sendMessage.setRecipients(facility);
          $scope.loadingContent = false;
          $scope.error = false;
          $animate.enabled(false);
          $scope.selected.messages = data.rows;
          window.setTimeout(updateRead, 1);
        });
      };

      var updateContact = function(options) {
        var selectedId = $scope.selected && $scope.selected.id;
        if (selectedId) {
          options = options || {};
          UserDistrict(function(err, district) {
            var skip = null;
            if (options.skip) {
              skip = $scope.selected.messages.length;
              $scope.loadingContent = true;
            }
            ContactConversation(district, selectedId, skip, function(err, data) {
              $animate.enabled(!options.skip);
              $scope.loadingContent = false;
              var userNotScrolled = $('#message-content').scrollTop < 200;
              var first = $('.item-content .body > ul > li').filter(':first');
              _.each(data.rows, function(updated) {
                var match = _.findWhere($scope.selected.messages, { id: updated.id });
                if (match) {
                  angular.extend(match, updated);
                } else {
                  $scope.selected.messages.push(updated);
                }
              });
              $scope.allLoaded = data.rows.length === 0;
              if (options.skip) {
                $('#unread-marker').remove();
              }
              if (userNotScrolled && first.length) {
                window.setTimeout(function() {
                  $('.item-content').scrollTop(first.offset().top - 140);
                }, 1);
              }
              markAllRead();
            });
          });
        }
      };

      var updateContacts = function(options) {
        options = options || {};
        UserDistrict(function(err, district) {
          MessageContact(district, function(err, data) {
            options.contacts = data.rows;
            $scope.setContacts(options);
            if (data.rows.length && !$scope.isSelected() && !$('#back').is(':visible')) {
              window.setTimeout(function() {
                var id = $('.inbox-items li').first().attr('data-record-id');
                selectContact(district, id);
              }, 1);
            }
          });
        });
      };

      var _checkScroll = function() {
        if (this.scrollTop === 0 && !$scope.allLoaded) {
          updateContact({ skip: true });
        }
      };

      if (!$scope.contacts || !$route.current.params.doc) {
        updateContacts();
      }

      if (!$route.current.params.doc) {
        RememberService.scrollTop = {};
      }
      $('.tooltip').remove();

      $scope.filterModel.type = 'messages';
      UserDistrict(function(err, district) {
        selectContact(district, $route.current.params.doc);
      });

      Changes(function() {
        updateContacts({ changes: true });
        updateContact({ changes: true });
      });

    }
  ]);

}());