describe('MessagesCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      UserDistrict;

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
    scope.setLeftActionBar = sinon.stub();

    UserDistrict = function(callback) {
      callback();
    };

    createController = function() {
      return $controller('MessagesCtrl', {
        '$scope': scope,
        'Changes': function() {
          return { unsubscribe: function() {} };
        },
        'MarkAllRead': {},
        'ContactConversation': KarmaUtils.nullPromise(),
        'MessageContact': KarmaUtils.nullPromise(),
        'Export': function() {},
        'Tour': function() {}
      });
    };
  }));

  it('set up controller', function() {
    createController();
  });

});