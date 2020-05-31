describe('MessagesContentCtrl', () => {
  'use strict';

  let controller;
  let scope;
  let state;
  let stateParams;
  let changes;
  let stubbedMessagesActions;
  let messagesActions;
  let sendMessage;
  let changesFilter;
  let changesCallback;
  let lineageModelGenerator;
  let messageContacts;
  let selectors;

  const createController = () => {
    return controller('MessagesContentCtrl', {
      '$q': Q,
      '$scope': scope,
      '$state': state,
      '$stateParams': stateParams,
      'Changes': changes,
      'LineageModelGenerator': lineageModelGenerator,
      'MessageContacts': messageContacts,
      'MessagesActions': () => messagesActions,
      'SendMessage': sendMessage,
      'Selectors': selectors,
    });
  };

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject((_$rootScope_, $controller, $ngRedux, MessagesActions) => {
    stubbedMessagesActions = {
      markConversationRead: sinon.stub(),
      updateSelectedConversation: sinon.stub(),
      removeMessageFromSelectedConversation: sinon.stub(),
    };
    messagesActions = Object.assign({}, MessagesActions($ngRedux.dispatch), stubbedMessagesActions);

    scope = _$rootScope_.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = selected => messagesActions.setSelectedConversation(selected);
    scope.setTitle = sinon.stub();

    state = {
      current: {
        name: 'something'
      },
      go: sinon.stub()
    };

    changes = sinon.stub().callsFake((opts) => {
      changesCallback = opts.callback;
      changesFilter = opts.filter;
      return { unsubscribe: sinon.stub() };
    });
    sendMessage = sinon.stub();
    controller = $controller;

    messageContacts = {
      isRelevantChange: sinon.stub(),
      conversation: sinon.stub(),
    };

    lineageModelGenerator = {
      contact: sinon.stub(),
    };
    stateParams = {};

    selectors = {
      getCurrentTab: sinon.stub().returns('messages'),
      getSelectedConversation: sinon.stub(),
      getLoadingContent: sinon.stub().returns(false),
    };
  }));

  describe('Messages without contact', () => {
    const id = 12;
    const type = 'contact';
    const phone = '+12';
    const res = {
      doc: {
        tasks: [
          { messages: [ { to: phone, contact: { _id: id }} ] },
          { messages: [ { to: phone, contact: { _id: id }} ] }
        ]
      }
    };

    it('pulls the contact phone number from the first message and shows empty user name', () => {
      stateParams = { id, type };

      lineageModelGenerator.contact.rejects({ code: 404 });
      messageContacts.conversation.resolves([res]);

      return createController()._testSelect.then(() => {
        chai.assert.equal(lineageModelGenerator.contact.callCount, 1);
        chai.assert.equal(lineageModelGenerator.contact.getCall(0).args[0], id);
        chai.assert.equal(messageContacts.conversation.callCount, 1);
        chai.assert.equal(messageContacts.conversation.getCall(0).args[0], id);
        chai.assert.equal(stubbedMessagesActions.updateSelectedConversation.callCount, 1);
        chai.assert.equal(stubbedMessagesActions.updateSelectedConversation.getCall(0).args[0].contact.doc.name, '');
        chai.assert.equal(
          stubbedMessagesActions.updateSelectedConversation.getCall(0).args[0].contact.doc.phone,
          phone
        );
      });
    });

    it('should not fail when no contact and no conversation', () => {
      stateParams = { id, type };
      lineageModelGenerator.contact.rejects({ code: 404 });
      messageContacts.conversation.resolves([]);

      return createController()._testSelect.then(() => {
        chai.assert.equal(lineageModelGenerator.contact.callCount, 1);
        chai.assert.equal(lineageModelGenerator.contact.getCall(0).args[0], id);
        chai.assert.equal(messageContacts.conversation.callCount, 1);
        chai.assert.deepEqual(messageContacts.conversation.getCall(0).args, [id]);
        chai.assert.equal(stubbedMessagesActions.updateSelectedConversation.callCount, 1);
        chai.assert.deepEqual(stubbedMessagesActions.updateSelectedConversation.args[0], [
          { contact: undefined, messages: [] }
        ]);
      });
    });
  });

  describe('Watching changes', () => {
    it('should start watching changes', () => {
      createController();

      chai.expect(changes.callCount).to.equal(1);
      chai.expect(changesFilter).to.be.a('function');
      chai.expect(changesCallback).to.be.a('function');
    });

    it('should filter relevant changes', () => {
      const selectedConversation = {
        contact: { name: 'peter' },
        messages: [
          { id: 'message1' },
          { id: 'message2' },
          { id: 'message3' }
        ]
      };
      selectors.getSelectedConversation.returns(selectedConversation);
      createController();
      const change = { id: 'id' };
      messageContacts.isRelevantChange.returns(false);
      chai.expect(!!changesFilter(change)).to.equal(false);
      chai.expect(messageContacts.isRelevantChange.callCount).to.deep.equal(1);
      chai.expect(messageContacts.isRelevantChange.args[0]).to.deep.equal([change, selectedConversation]);
      messageContacts.isRelevantChange.returns(true);
      const change2 = { id: 'id' };
      chai.expect(!!changesFilter(change2)).to.equal(true);
      chai.expect(messageContacts.isRelevantChange.callCount).to.deep.equal(2);
      chai.expect(messageContacts.isRelevantChange.args[1]).to.deep.equal([change2, selectedConversation]);
    });

    describe('updating the conversation', () => {
      it('should not do anything when no conversation is selected', () => {
        selectors.getSelectedConversation.returns();
        const change = { id: 'id', deleted: true };
        createController();
        return Promise
          .resolve()
          .then(() => {
            chai.expect(messageContacts.conversation.callCount).to.equal(0);
            changesCallback(change);
            return Promise.resolve();
          })
          .then(() => {
            chai.expect(messageContacts.conversation.callCount).to.equal(0);
          });
      });

      it('should update the conversation when conversation is selected', () => {
        const contact = { name: 'contact', _id: 'c1' };
        const messages = [{ doc: { _id: 'message1' } }, { doc: { _id: 'message2' } } ];
        messageContacts.conversation
          .onCall(0).resolves(messages)
          .onCall(1).resolves([...messages, { doc: { _id: 'message3' } }]);

        lineageModelGenerator.contact.resolves(contact);
        selectors.getSelectedConversation
          .onCall(0).returns()
          .returns({ contact, messages, id: contact._id });

        stateParams = { id: 'c1', type: 'contact' };
        createController();
        return Promise
          .resolve()
          .then(() => {
            chai.expect(messageContacts.conversation.callCount).to.equal(1);
            chai.expect(lineageModelGenerator.contact.callCount).to.equal(1);
            const change = { id: 'message3' };
            changesCallback(change);
            return Promise.resolve();
          })
          .then(() => {
            chai.expect(messageContacts.conversation.callCount).to.equal(2);
            chai.expect(messageContacts.conversation.args[1]).to.deep.equal(['c1', undefined, messages.length]);
            chai.expect(messagesActions.updateSelectedConversation.callCount).to.equal(1);
            chai.expect(messagesActions.updateSelectedConversation.args[0]).to.deep.equal([
              { messages: [...messages, { doc: { _id: 'message3' } }] }
            ]);
          });
      });

      it('should remove deleted messages from selected conversation', () => {
        const contact = { name: 'contact', _id: 'c1' };
        const messages = [{ doc: { _id: 'message1' } }, { doc: { _id: 'message2' } } ];
        messageContacts.conversation.resolves(messages);

        lineageModelGenerator.contact.resolves(contact);
        selectors.getSelectedConversation
          .onCall(0).returns()
          .returns({ contact, messages, id: contact._id });

        stateParams = { id: 'c1', type: 'contact' };
        createController();
        return Promise
          .resolve()
          .then(() => {
            chai.expect(messageContacts.conversation.callCount).to.equal(1);
            chai.expect(lineageModelGenerator.contact.callCount).to.equal(1);
            const change = { id: 'message2', deleted: true };
            changesCallback(change);
            return Promise.resolve();
          })
          .then(() => {
            chai.expect(messageContacts.conversation.callCount).to.equal(1);
            chai.expect(messagesActions.updateSelectedConversation.callCount).to.equal(0);
            chai.expect(messagesActions.removeMessageFromSelectedConversation.callCount).to.equal(1);
            chai.expect(messagesActions.removeMessageFromSelectedConversation.args[0]).to.deep.equal(['message2']);
          });
      });
    });
  });

});
