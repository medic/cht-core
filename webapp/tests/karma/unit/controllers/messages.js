describe('MessagesCtrl controller', () => {

  'use strict';

  let createController;
  let scope;
  let changesFilter;
  let changesCallback;
  let messageContacts;
  let globalActions;
  let messageActions;
  let selectors;
  let messageListUtils;

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject(($rootScope, $controller) => {
    scope = $rootScope.$new();
    scope.filterModel = {};
    scope.permissions = { admin: true };
    messageContacts = {
      list: sinon.stub(),
      isRelevantChange: sinon.stub(),
    };
    messageActions = {
      setConversations: sinon.stub(),
      setSelectedConversation: sinon.stub(),
    };

    globalActions = {
      setLeftActionBar: sinon.stub(),
    };

    selectors = {
      getCurrentTab: sinon.stub().returns('messages'),
      getSelectedConversation: sinon.stub(),
      getConversations: sinon.stub(),
    };

    messageListUtils = {
      removeDeleted: sinon.stub(),
      mergeUpdated: sinon.stub(),
    };

    createController = () => {
      return $controller('MessagesCtrl', {
        '$scope': scope,
        'Changes': (opts) => {
          changesFilter = opts.filter;
          changesCallback = opts.callback;
          return { unsubscribe: () => {} };
        },
        'MarkAllRead': {},
        'MessageContacts': messageContacts,
        'GlobalActions': () => globalActions,
        'MessagesActions': () => messageActions,
        'MessageListUtils': messageListUtils,
        'Selectors': selectors,
        'Export': () => {},
        'Tour': () => {}
      });
    };
  }));

  it('set up controller', () => {
    messageContacts.list.resolves([
      { id: 'conversation1' },
      { id: 'conversation2' },
    ]);
    createController();
    chai.expect(changesFilter).to.be.a('function');
    chai.expect(changesCallback).to.be.a('function');
    return Promise.resolve().then(() => {
      chai.expect(messageActions.setSelectedConversation.callCount).to.equal(1);
      chai.expect(messageActions.setSelectedConversation.args[0]).to.deep.equal([null]);
      chai.expect(messageContacts.list.callCount).to.equal(1);
      chai.expect(messageActions.setConversations.callCount).to.equal(1);
      chai.expect(messageActions.setConversations.args[0]).to.deep.equal([[
        { id: 'conversation1' },
        { id: 'conversation2' },
      ]]);
      chai.expect(messageListUtils.removeDeleted.callCount).to.equal(0);
      chai.expect(messageListUtils.mergeUpdated.callCount).to.equal(0);
    });
  });

  describe('changes handling', () => {
    it('should filter only relevant messages', () => {
      messageContacts.list.resolves([]);
      createController();
      const change = { id: 'id' };
      messageContacts.isRelevantChange.returns(false);
      chai.expect(!!changesFilter(change)).to.equal(false);
      chai.expect(messageContacts.isRelevantChange.callCount).to.deep.equal(1);
      chai.expect(messageContacts.isRelevantChange.args[0]).to.deep.equal([change]);
      messageContacts.isRelevantChange.returns(true);
      const change2 = { id: 'id' };
      chai.expect(!!changesFilter(change2)).to.equal(true);
      chai.expect(messageContacts.isRelevantChange.callCount).to.deep.equal(2);
      chai.expect(messageContacts.isRelevantChange.args[1]).to.deep.equal([change2]);
    });

    it('should refresh the list when receiving a relevant change', () => {
      messageContacts.list
        .onCall(0).resolves([])
        .onCall(1).resolves([{ id: 'message1' }]);

      createController();

      return Promise
        .resolve()
        .then(() => {
          chai.expect(messageContacts.list.callCount).to.equal(1);
          chai.expect(messageActions.setConversations.callCount).to.equal(1);
          chai.expect(messageActions.setConversations.args[0]).to.deep.equal([[]]);
          const change = { id: 'change' };
          changesCallback(change);
          return Promise.resolve();
        })
        .then(() => {
          chai.expect(messageContacts.list.callCount).to.equal(2);
          chai.expect(messageListUtils.mergeUpdated.callCount).to.equal(1);
          chai.expect(messageListUtils.mergeUpdated.args[0]).to.deep.equal([undefined, [{ id: 'message1' }]]);
          chai.expect(messageListUtils.removeDeleted.callCount).to.equal(1);
          chai.expect(messageListUtils.removeDeleted.args[0]).to.deep.equal([undefined, [{ id: 'message1' }]]);
          chai.expect(messageActions.setConversations.callCount).to.equal(2);
          chai.expect(messageActions.setConversations.args[1]).to.deep.equal([[{ id: 'message1' }]]);
        });
    });
  });

});
