var _ = require('underscore');

angular.module('inboxControllers').controller('MessagesContentCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    $stateParams,
    $timeout,
    Changes,
    LineageModelGenerator,
    MarkAllRead,
    MessageContacts,
    Modal,
    SendMessage,
    Session
  ) {

    'use strict';
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
      if (docs.length) {
        MarkAllRead(docs, true)
          .then($scope.updateReadStatus)
          .catch(function(err) {
            return $log.error('Error marking all as read', err);
          });
      }
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
      $q.all([
        LineageModelGenerator.contact(id),
        MessageContacts({ id: id })
      ])
        .then(function(results) {
          var contactModel = results[0];
          var conversation = results[1];
          if ($scope.selected && $scope.selected.id !== id) {
            // ignore response for previous request
            return;
          }

          $scope.setLoadingContent(false);
          $scope.error = false;
          var unread = _.filter(conversation, function(message) {
            return !$scope.isRead(message.doc);
          });
          $scope.firstUnread = _.min(unread, function(message) {
            return message.doc.reported_date;
          });
          $scope.selected.contact = contactModel.doc ? contactModel : { name: id };
          $scope.selected.messages = conversation;
          $scope.setTitle((contactModel.doc && contactModel.doc.name) || id);
          markAllRead();
          $timeout(scrollToUnread);
        })
        .catch(function(err) {
          $scope.loadingContent = false;
          $scope.error = true;
          $log.error('Error fetching contact conversation', err);
        });
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
        MessageContacts(opts)
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
      if (!$scope.selected) {
        $log.error('Error sending message', new Error('No facility selected'));
        return;
      }
      var recipient;
      if ($scope.selected.contact.doc) { // known contact
        recipient = { doc: $scope.selected.contact.doc };
      } else { // unknown sender
        recipient = { doc: { contact: { phone: $scope.selected.id } } };
      }
      SendMessage(recipient, $scope.send.message)
        .then(function() {
          $scope.send.message = '';
        })
        .catch(function(err) {
          $log.error('Error sending message', err);
        });
    };

    $scope.addRecipients = function() {
      Modal({
        templateUrl: 'templates/modals/send_message.html',
        controller: 'SendMessageCtrl',
        model: {
          to: $scope.selected.id,
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
