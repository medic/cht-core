describe('MessagesCtrl controller', () => {

  'use strict';

  let createController,
      scope,
      UserDistrict;

  beforeEach(module('inboxApp'));

  beforeEach(inject(($rootScope, $controller) => {
    scope = $rootScope.$new();
    scope.filterModel = {};
    scope.selected = { id: 'a' };
    scope.permissions = { admin: true };
    scope.setMessages = () => {};
    scope.setSelected = obj => scope.selected = obj;
    scope.setLoadingContent = () => {};
    scope.setLeftActionBar = sinon.stub();
    UserDistrict = callback => callback();
    createController = () => {
      return $controller('MessagesCtrl', {
        '$scope': scope,
        'Changes': () => {
          return { unsubscribe: () => {} };
        },
        'MarkAllRead': {},
        'ContactConversation': KarmaUtils.nullPromise(),
        'MessageContacts': KarmaUtils.nullPromise(),
        'Export': () => {},
        'Tour': () => {}
      });
    };
  }));

  it('set up controller', () => {
    createController();
  });

});