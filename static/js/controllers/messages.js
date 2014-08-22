var _ = require('underscore'),
    sendMessage = require('../modules/send-message');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('MessagesCtrl', 
    ['$scope', '$route', 'MessageContacts', 'MarkAllRead', 'UserDistrict',
    function ($scope, $route, MessageContacts, MarkAllRead, UserDistrict) {

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
        var content = $('body .item-content');
        var firstUnread = content.find('.body .unread').filter(':first');
        var scrollTo;
        if (firstUnread.length) {
          firstUnread.before('<li id="unread-marker" class="marker">Unread messages below</li>');
          scrollTo = $('#unread-marker').offset().top - 150;
        } else {
          scrollTo = content[0].scrollHeight;
        }
        content.scrollTop(scrollTo);
      };

      var updateRead = function() {
        placeUnreadMarker();
        markAllRead();
      };

      var findMostRecentFacility = function(messages) {
        for (var i = messages.length - 1; i >= 0; i--) {
          if (messages[i].value.facility) {
            return messages[i].value.facility;
          }
        }
      };

      var selectContact = function(district, id) {
        
        if (!id) {
          $scope.error = false;
          $scope.loadingContent = false;
          $scope.setSelected();
          return;
        }
        $scope.loadingContent = true;
        $scope.setSelected({ id: id });
        MessageContacts(district, id, function(err, messages) {
          if (err) {
            $scope.loadingContent = false;
            $scope.error = true;
            return;
          }
          var facility = findMostRecentFacility(messages);
          sendMessage.setRecipients([{ doc: facility }]);

          $scope.loadingContent = false;
          $scope.error = false;
          $scope.selected.messages = messages;
          window.setTimeout(updateRead, 1);
        });
      };

      $scope.filterModel.type = 'messages';
      UserDistrict().then(function(res) {
        var district = $scope.permissions.admin ? undefined : res.district;
        selectContact(district, $route.current.params.doc);
        if (!$scope.contacts || !$route.current.params.doc) {
          MessageContacts(district, null, function(err, contacts) {
            $scope.setContacts(contacts);
          });
        }
      });
    }
  ]);

}());