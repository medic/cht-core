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
    scope.setSelected = function(obj) {
      scope.selected = obj;
    };

    UserDistrict = function(callback) {
      callback();
    };

    ContactConversation = function() { };

    MessageContact = function() { };

    Changes = function() { };

    createController = function() {
      return $controller('MessagesCtrl', {
        '$scope': scope,
        '$route': { current: { params: { doc: 'x' } } },
        'Changes': Changes,
        'MarkAllRead': {},
        'ContactConversation': ContactConversation,
        'MessageContact': MessageContact
      });
    };
  }));

  it('set up controller', function() {
    createController();
    chai.expect(scope.filterModel.type).to.equal('messages');
    chai.expect(scope.selected.id).to.equal('x');
  });

});