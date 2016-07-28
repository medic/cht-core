describe('MessagesCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      UserDistrict,
      ContactConversation,
      MessageContact,
      Changes;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    scope.filterModel = {};
    scope.selected = { id: 'a' };
    scope.permissions = { admin: true };
    scope.setMessages = function() {};
    scope.setSelected = function(obj) {
      scope.selected = obj;
    };
    scope.setLoadingContent = function() {};

    UserDistrict = function(callback) {
      callback();
    };

    ContactConversation = function() { };

    MessageContact = function() { };

    Changes = function() { };

    createController = function() {
      return $controller('MessagesCtrl', {
        '$scope': scope,
        'Changes': Changes,
        'MarkAllRead': {},
        'ContactConversation': ContactConversation,
        'MessageContact': MessageContact,
        'Export': function() {}
      });
    };
  }));

  it('set up controller', function() {
    createController();
  });

});