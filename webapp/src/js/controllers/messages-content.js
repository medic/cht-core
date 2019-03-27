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
    Actions,
    Changes,
    LineageModelGenerator,
    MarkRead,
    MessageContacts,
    Modal,
    Selectors,
    SendMessage,
    Session
  ) {

    'use strict';
    'ngInject';

    var ctrl = this;
    var mapStateToTarget = function(state) {
      return {
        selected: Selectors.getSelected(state)
      };
    };
    var mapDispatchToTarget = function(dispatch) {
      var actions = Actions(dispatch);
      return {
        addSelectedMessage: actions.addSelectedMessage,
        removeSelectedMessage: actions.removeSelectedMessage,
        updateSelected: actions.updateSelected
      };
    };
    var unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

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
      var docs = _.pluck(ctrl.selected.messages, 'doc');
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
        $scope.error = false;
        $scope.loadingContent = false;
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
          if (ctrl.selected && ctrl.selected.id !== id) {
            // ignore response for previous request
            return;
          }

          $scope.setLoadingContent(false);
          $scope.error = false;
          var unread = _.filter(conversation, function(message) {
            return !message.read;
          });
          $scope.firstUnread = _.min(unread, function(message) {
            return message.doc.reported_date;
          });
          ctrl.updateSelected({ contact: contactModel, messages: conversation });
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
      var selectedId = ctrl.selected && ctrl.selected.id;
      if (selectedId) {
        var skip = options.skip && ctrl.selected.messages.length;
        if (skip) {
          $timeout(function() {
            $scope.loadingMoreContent = true;
          });
        }

        MessageContacts.conversation(selectedId, skip)
          .then(function(conversation) {
            $scope.loadingMoreContent = false;
            var contentElem = $('.message-content-wrapper');
            var scrollToBottom = contentElem.scrollTop() + contentElem.height() + 30 > contentElem[0].scrollHeight;
            var first = $('.item-content .body > ul > li').filter(':first');
            conversation.forEach(function(updated) {
              var match = _.findWhere(ctrl.selected.messages, { id: updated.id });
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
      if (!ctrl.selected) {
        $log.error('Error sending message', new Error('No facility selected'));
        return;
      }
      let recipient;
      if (ctrl.selected.contact.doc) { // known contact
        recipient = { doc: ctrl.selected.contact.doc };
      } else { // unknown sender
        recipient = { doc: { contact: { phone: ctrl.selected.id } } };
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
        model: {
          to: ctrl.selected.id,
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
          ctrl.selected &&
          _.findWhere(ctrl.selected.messages, { id: change.id });
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
