describe('MessagesCtrl controller', () => {

  'use strict';

  let createController,
      actions,
      scope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(($rootScope, $controller) => {
    scope = $rootScope.$new();
    scope.filterModel = {};
    scope.permissions = { admin: true };
    scope.setMessages = () => {};
    scope.setLoadingContent = () => {};
    scope.setLeftActionBar = sinon.stub();
    actions = { setSelected: sinon.stub() };
    createController = () => {
      return $controller('MessagesCtrl', {
        '$scope': scope,
        'Actions': () => actions,
        'Changes': () => {
          return { unsubscribe: () => {} };
        },
        'MarkAllRead': {},
        'MessageContacts': {
          list: KarmaUtils.nullPromise(),
          conversation: KarmaUtils.nullPromise()
        },
        'Export': () => {},
        'Tour': () => {}
      });
    };
  }));

  it('set up controller', () => {
    createController();
  });

});
