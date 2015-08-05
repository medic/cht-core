var _ = require('underscore'),
    sendMessage = require('../modules/send-message');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('MessagesContentCtrl', 
    ['$scope', '$stateParams', '$timeout', 'ContactConversation', 'MarkAllRead', 'Changes', 'Session',
    function ($scope, $stateParams, $timeout, ContactConversation, MarkAllRead, Changes, Session) {

      var scrollToUnread = function() {
        var content = $('#message-content');
        var markers = content.find('.marker');
        var scrollTo;
        if (markers.length) {
          scrollTo = markers.filter(':first').offset().top - 150;
        } else {
          scrollTo = content[0].scrollHeight;
        }
        content.scrollTop(scrollTo);
        $('#message-content').on('scroll', _checkScroll);
      };

      var markAllRead = function() {
        var docs = _.pluck($scope.selected.messages, 'doc');
        MarkAllRead(docs, true)
          .then($scope.updateReadStatus)
          .catch(function(err) {
            return console.log('Error marking all as read', err);
          });
      };

      var findMostRecentFacility = function(messages) {
        var message = _.find(messages, function(message) {
          return message.value.facility;
        });
        if (message) {
          return [{ doc: message.value.facility }];
        }
        message = _.find(messages, function(message) {
          return message.value && message.value.contact && message.value.contact.name;
        });
        if (message) {
          return [{ doc: { contact: { phone: message.value.contact.name } } }];
        }
        return [];
      };

      var selectContact = function(id) {
        if (!id) {
          $scope.error = false;
          $scope.loadingContent = false;
          $scope.setSelected();
          return;
        }
        $('#message-content').off('scroll', _checkScroll);
        $scope.loadingContent = true;
        $scope.setSelected({ id: id });
        $scope.setLoadingContent(id);
        var opts = {
          id: id,
          districtAdmin: $scope.permissions.districtAdmin
        };
        ContactConversation(opts, function(err, data) {
          if (err) {
            $scope.loadingContent = false;
            $scope.error = true;
            console.log('Error fetching contact conversation', err);
            return;
          }
          if ($scope.selected && $scope.selected.id !== id) {
            // ignore response for previous request
            return;
          }
          sendMessage.setRecipients(findMostRecentFacility(data));
          $scope.loadingContent = false;
          $scope.error = false;
          var unread = _.filter(data, function(message) {
            return !$scope.isRead(message.doc);
          });
          $scope.firstUnread = _.min(unread, function(message) {
            return message.doc.reported_date;
          });
          $scope.selected.messages = data;
          markAllRead();
          $timeout(scrollToUnread);
        });
      };

      var updateContact = function(options) {
        var selectedId = $scope.selected && $scope.selected.id;
        if (selectedId) {
          options = options || {};
          if (options.changes && options.changes.deleted) {
            for (var i = $scope.selected.messages.length - 1; i >= 0; i--) {
              if ($scope.selected.messages[i].id === options.changes.id) {
                $scope.selected.messages.splice(i, 1);
              }
            }
          }
          var opts = {
            id: selectedId,
            districtAdmin: $scope.permissions.districtAdmin
          };
          if (options.skip) {
            opts.skip = $scope.selected.messages.length;
            $timeout(function() {
              $scope.loadingMoreContent = true;
            });
          }
          ContactConversation(opts, function(err, data) {
            if (err) {
              return console.log('Error fetching contact conversation', err);
            }
            $scope.loadingMoreContent = false;
            var contentElem = $('#message-content');
            var scrollToBottom = contentElem.scrollTop() + contentElem.height() + 30 > contentElem[0].scrollHeight;
            var first = $('.item-content .body > ul > li').filter(':first');
            _.each(data, function(updated) {
              var match = _.findWhere($scope.selected.messages, { id: updated.id });
              if (match) {
                angular.extend(match, updated);
              } else {
                $scope.selected.messages.push(updated);
                if (updated.doc.sent_by === Session.userCtx().name) {
                  scrollToBottom = true;
                }
              }
            });
            $scope.allLoaded = data.length < 50;
            if (options.skip) {
              $scope.firstUnread = undefined;
            }
            markAllRead();
            $timeout(function() {
              var scroll = false;
              if (options.skip) {
                var spinnerHeight = 102;
                scroll = $('#message-content li')[data.length].offsetTop - spinnerHeight;
              } else if (first.length && scrollToBottom) {
                scroll = $('#message-content')[0].scrollHeight;
              }
              if (scroll) {
                $('#message-content').scrollTop(scroll);
              }
            });
          });
        }
      };

      var _checkScroll = function() {
        if (this.scrollTop === 0 && !$scope.allLoaded) {
          updateContact({ skip: true });
        }
      };

      $scope.addRecipients = function(to) {
        sendMessage.showModal({
          to: to.facility || to.contact,
          message: $('#message-footer [name=message]').val()
        });
      };

      Changes({ key: 'messages-content' }, function(data) {
        updateContact({ changes: data });
      });

      $('.tooltip').remove();
      selectContact($stateParams.id);

      $('body')
        .on('focus', '#message-footer textarea', function() {
          $('#message-footer').addClass('sending');
        })
        .on('blur', '#message-footer textarea', function() {
          $('#message-footer').removeClass('sending');
        });
    }
  ]);

}());