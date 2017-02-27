var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('MessagesContentCtrl',
    function (
      $log,
      $scope,
      $state,
      $stateParams,
      $timeout,
      Changes,
      ContactConversation,
      MarkAllRead,
      Modal,
      SendMessage,
      Session
    ) {

      'ngInject';

      $scope.send = {
        message: ''
      };

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
            return $log.error('Error marking all as read', err);
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

      var selectContact = function(id, options) {
        options = options || {};
        if (!id) {
          $scope.error = false;
          $scope.loadingContent = false;
          $scope.clearSelected();
          return;
        }
        $('#message-content').off('scroll', _checkScroll);
        $scope.setSelected({ id: id, messages: [] });
        if (!options.silent) {
          $scope.setLoadingContent(id);
        }
        ContactConversation({ id: id })
          .then(function(data) {
            if ($scope.selected && $scope.selected.id !== id) {
              // ignore response for previous request
              return;
            }

            $scope.setLoadingContent(false);
            $scope.error = false;
            var unread = _.filter(data, function(message) {
              return !$scope.isRead(message.doc);
            });
            $scope.firstUnread = _.min(unread, function(message) {
              return message.doc.reported_date;
            });
            $scope.selected.messages = data;
            if (data.length) {
              setTitle(data.length && data[0].value);
              markAllRead();
            }
            $timeout(scrollToUnread);
          })
          .catch(function(err) {
            $scope.loadingContent = false;
            $scope.error = true;
            $log.error('Error fetching contact conversation', err);
          });
      };

      var setTitle = function(message) {
        var title = message.contact.name ||
          (!message.form && message.name) ||
          message.from ||
          message.sent_by;
        $scope.setTitle(title);
      };

      var updateConversation = function(options) {
        var selectedId = $scope.selected && $scope.selected.id;
        if (selectedId) {
          options = options || {};
          var opts = { id: selectedId };
          if (options.skip) {
            opts.skip = $scope.selected.messages.length;
            $timeout(function() {
              $scope.loadingMoreContent = true;
            });
          }
          ContactConversation(opts)
            .then(function(data) {
              $scope.loadingMoreContent = false;
              var contentElem = $('#message-content');
              var scrollToBottom = contentElem.scrollTop() + contentElem.height() + 30 > contentElem[0].scrollHeight;
              var first = $('.item-content .body > ul > li').filter(':first');
              data.forEach(function(updated) {
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
            })
            .catch(function(err) {
              $log.error('Error fetching contact conversation', err);
            });
        }
      };

      var _checkScroll = function() {
        if (this.scrollTop === 0 && !$scope.allLoaded) {
          updateConversation({ skip: true });
        }
      };

      $scope.sendMessage = function() {
        var recipients = findMostRecentFacility($scope.selected.messages);
        if (recipients.length === 0) {
          $log.error('Error sending message', new Error('No facility selected'));
          return;
        }
        SendMessage(recipients, $scope.send.message)
          .then(function() {
            $scope.send.message = '';
          })
          .catch(function(err) {
            $log.error('Error sending message', err);
          });
      };

      $scope.addRecipients = function() {
        var recipient = $scope.selected &&
                        $scope.selected.messages &&
                        $scope.selected.messages.length &&
                        $scope.selected.messages[0].value;

        if (recipient) {
          if (recipient.facility) {
            recipient = recipient.facility._id;
          } else if (recipient.contact) {
            if (recipient.contact._id) {
              recipient = recipient.contact._id;
            } else if (recipient.contact.name) {
              recipient = recipient.contact.name; // raw phone number
            }
          }
        }

        Modal({
          templateUrl: 'templates/modals/send_message.html',
          controller: 'SendMessageCtrl',
          model: {
            to: recipient,
            message: $scope.send.message
          }
        });

        $scope.send.message = '';
      };

      var changeListener = Changes({
        key: 'messages-content',
        callback: function(change) {
          if (change.deleted) {
            var index = _.findIndex($scope.selected.messages, { id: change.id });
            $scope.selected.messages.splice(index, 1);
          } else {
            updateConversation({ changes: true });
          }
        },
        filter: function(change) {
          return $scope.currentTab === 'messages' &&
            $scope.selected &&
            _.findWhere($scope.selected.messages, { id: change.id });
        }
      });

      $scope.$on('$destroy', changeListener.unsubscribe);

      $('.tooltip').remove();
      selectContact($stateParams.id);
      $scope.$on('UpdateContactConversation', function(e, options) {
        selectContact($stateParams.id, options);
      });

      $('body')
        .on('focus', '#message-footer textarea', function() {
          $('#message-footer').addClass('sending');
        })
        .on('blur', '#message-footer textarea', function() {
          $('#message-footer').removeClass('sending');
        });

      $scope.$on('$stateChangeStart', function(event, toState) {
        if (toState.name.indexOf('messages.detail') === -1) {
          $scope.unsetSelected();
        }
      });

    }
  );

}());
