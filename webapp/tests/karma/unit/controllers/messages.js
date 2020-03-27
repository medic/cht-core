describe('MessagesCtrl controller', () => {

  'use strict';

  let createController;
  let scope;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject(($rootScope, $controller) => {
    scope = $rootScope.$new();
    scope.filterModel = {};
    scope.permissions = { admin: true };
    scope.setMessages = () => {};
    createController = () => {
      return $controller('MessagesCtrl', {
        '$scope': scope,
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
