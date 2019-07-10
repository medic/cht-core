var _ = require('underscore');

// In this context $stateParams.id (the id in the url) can be:
//  - the _id of the contact who is sending these messages
//  - the phone number if it couldn't be resolved into a contact
//  - the _id of the data_record if there is no discernable phone number
//  This is determined by its $stateParams.type: 'contact', 'phone' or 'unknown'
//  respectively
angular.module('inboxControllers').controller('MessagesContentCtrl',
  function (
    $log,
    $ngRedux,
    $q,
    $scope,
    $state,
    $stateParams,
    $timeout,
    Changes,
    GlobalActions,
    LineageModelGenerator,
    MarkRead,
    MessageContacts,
    MessagesActions,
    Modal,
    Selectors,
    SendMessage,
    Session
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        loadingContent: Selectors.getLoadingContent(state),
        selectedMessage: Selectors.getSelectedMessage(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      const messagesActions = MessagesActions(dispatch);
      return {
        addSelectedMessage: messagesActions.addSelectedMessage,
        removeSelectedMessage: messagesActions.removeSelectedMessage,
        setLoadingContent: globalActions.setLoadingContent,
        setMessagesError: messagesActions.setMessagesError,
        updateSelectedMessage: messagesActions.updateSelectedMessage
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    $scope.send = {
      message: ''
    };

    const userCtx = Session.userCtx();

    var checkScroll = function() {
      if (this.scrollTop === 0 && !$scope.allLoaded) {
        updateConversation({ skip: true });
      }
    };

    var scrollToUnread = function() {
      var content = $('.message-content-wrapper');
      var markers = content.find('.marker');
      var scrollTo;
      if (markers.length) {
        scrollTo = markers.filter(':first').offset().top - 150;
      } else {
        scrollTo = content[0].scrollHeight;
      }
      content.scrollTop(scrollTo);
      $('.message-content-wrapper').on('scroll', checkScroll);
    };

    var markAllRead = function() {
      var docs = _.pluck(ctrl.selectedMessage.messages, 'doc');
      if (docs.length) {
        $scope.markConversationRead(docs);
        MarkRead(docs)
          .then($scope.updateUnreadCount)
          .catch(function(err) {
            return $log.error('Error marking all as read', err);
          });
      }
    };

    // See $stateParams.id note at top of file
    var getContactable = function(id, type) {
      if (type === 'contact') {
        return LineageModelGenerator.contact(id);
      } else if (type === 'phone') {
        return {name: id};
      } else {
        return {};
      }
    };

    var selectContact = function(id, type, options) {
      options = options || {};
      if (!id) {
        ctrl.setMessagesError(false);
        ctrl.setLoadingContent(false);
        $scope.clearSelected();
        return;
      }
      $('.message-content-wrapper').off('scroll', checkScroll);
      $scope.setSelected({ id: id, messages: [] });
      if (!options.silent) {
        $scope.setLoadingContent(id);
      }
      $q.all([
        getContactable(id, type),
        MessageContacts.conversation(id)
      ])
        .then(function(results) {
          var contactModel = results[0];
          var conversation = results[1];
          if (ctrl.selectedMessage && ctrl.selectedMessage.id !== id) {
            // ignore response for previous request
            return;
          }

          $scope.setLoadingContent(false);
          ctrl.setMessagesError(false);
          var unread = _.filter(conversation, function(message) {
            return !message.read;
          });
          $scope.firstUnread = _.min(unread, function(message) {
            return message.doc.reported_date;
          });
          ctrl.updateSelectedMessage({ contact: contactModel, messages: conversation });
          $scope.setTitle((contactModel.doc && contactModel.doc.name) || id);
          markAllRead();
          $timeout(scrollToUnread);
        })
        .catch(function(err) {
          ctrl.setLoadingContent(false);
          ctrl.setMessagesError(true);
          $log.error('Error fetching contact conversation', err);
        });
    };

    var updateConversation = function(options) {
      var selectedId = ctrl.selectedMessage && ctrl.selectedMessage.id;
      if (selectedId) {
        var skip = options.skip && ctrl.selectedMessage.messages.length;
        if (skip) {
          $timeout(function() {
            ctrl.loadingMoreContent = true;
          });
        }

        MessageContacts.conversation(selectedId, skip)
          .then(function(conversation) {
            ctrl.loadingMoreContent = false;
            var contentElem = $('.message-content-wrapper');
            var scrollToBottom = contentElem.scrollTop() + contentElem.height() + 30 > contentElem[0].scrollHeight;
            var first = $('.item-content .body > ul > li').filter(':first');
            conversation.forEach(function(updated) {
              var match = _.findWhere(ctrl.selectedMessage.messages, { id: updated.id });
              if (match) {
                angular.extend(match, updated);
              } else {
                ctrl.addSelectedMessage(updated);
                if (updated.doc.sent_by === userCtx.name) {
                  scrollToBottom = true;
                }
              }
            });
            $scope.allLoaded = conversation.length < 50;
            if (options.skip) {
              delete $scope.firstUnread;
            }
            markAllRead();
            $timeout(function() {
              var scroll = false;
              if (options.skip) {
                var spinnerHeight = 102;
                scroll = $('.message-content-wrapper li')[conversation.length].offsetTop - spinnerHeight;
              } else if (first.length && scrollToBottom) {
                scroll = $('.message-content-wrapper')[0].scrollHeight;
              }
              if (scroll) {
                $('.message-content-wrapper').scrollTop(scroll);
              }
            });
          })
          .catch(function(err) {
            $log.error('Error fetching contact conversation', err);
          });
      }
    };

    $scope.sendMessage = () => {
      if (!ctrl.selectedMessage) {
        $log.error('Error sending message', new Error('No facility selected'));
        return;
      }
      let recipient;
      if (ctrl.selectedMessage.contact.doc) { // known contact
        recipient = { doc: ctrl.selectedMessage.contact.doc };
      } else { // unknown sender
        recipient = { doc: { contact: { phone: ctrl.selectedMessage.id } } };
      }
      SendMessage(recipient, $scope.send.message)
        .then(() => {
          $scope.send.message = '';
        })
        .catch(err => {
          $log.error('Error sending message', err);
        });
    };

    $scope.addRecipients = function() {
      Modal({
        templateUrl: 'templates/modals/send_message.html',
        controller: 'SendMessageCtrl',
        controllerAs: 'sendMessageCtrl',
        model: {
          to: ctrl.selectedMessage.id,
          message: $scope.send.message
        }
      });
      $scope.send.message = '';
    };

    var changeListener = Changes({
      key: 'messages-content',
      callback: function(change) {
        if (change.deleted) {
          ctrl.removeSelectedMessage(change.id);
        } else {
          updateConversation({ changes: true });
        }
      },
      filter: function(change) {
        return $scope.currentTab === 'messages' &&
          ctrl.selectedMessage &&
          _.findWhere(ctrl.selectedMessage.messages, { id: change.id });
      }
    });

    $scope.$on('$destroy', function() {
      unsubscribe();
      changeListener.unsubscribe();
      if (!$state.includes('messages.detail')) {
        $('body').off('focus', '#message-footer textarea');
        $('body').off('blur', '#message-footer textarea');
      }
    });

    $('.tooltip').remove();


    // See $stateParams.id note at top of file
    selectContact($stateParams.id, $stateParams.type);
    $scope.$on('UpdateContactConversation', function(e, options) {
      selectContact($stateParams.id, $stateParams.type, options);
    });

    $('body')
      .on('focus', '#message-footer textarea', function() {
        $('#message-footer').addClass('sending');
      })
      .on('blur', '#message-footer textarea', function() {
        $('#message-footer').removeClass('sending');
      });

  }
);
