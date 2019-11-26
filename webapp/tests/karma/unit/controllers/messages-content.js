describe('MessagesContentCtrl', () => {
  'use strict';

  let controller;
  let scope;
  let state;
  let stateParams;
  let changes;
  let contact;
  let conversation;
  let stubbedMessagesActions;
  let messagesActions;
  let sendMessage;

  const createController = () => {
    return controller('MessagesContentCtrl', {
      '$q': Q,
      '$scope': scope,
      '$state': state,
      '$stateParams': stateParams,
      'Changes': changes,
      'LineageModelGenerator': { contact },
      'MessageContacts': { conversation },
      'MessagesActions': () => messagesActions,
      'SendMessage': sendMessage
    });
  };

  beforeEach(() => {
    module('inboxApp');
    KarmaUtils.setupMockStore();
  });

  beforeEach(inject((_$rootScope_, $controller, $ngRedux, MessagesActions) => {
    stubbedMessagesActions = {
      markConversationRead: sinon.stub(),
      updateSelectedMessage: sinon.stub()
    };
    messagesActions = Object.assign({}, MessagesActions($ngRedux.dispatch), stubbedMessagesActions);

    scope = _$rootScope_.$new();
    scope.setLoadingContent = sinon.stub();
    scope.setSelected = selected => messagesActions.setSelectedMessage(selected);
    scope.setTitle = sinon.stub();

    state = {
      current: {
        name: 'something'
      },
      go: sinon.stub()
    };

    changes = sinon.stub();
    sendMessage = sinon.stub();
    controller = $controller;
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

      const error404 = { code: 404 };
      contact = sinon.stub().rejects(error404);

      conversation = sinon.stub().resolves([res]);

      return createController()._testSelect.then(() => {
        chai.assert.equal(contact.callCount, 1);
        chai.assert.equal(contact.getCall(0).args[0], id);
        chai.assert.equal(conversation.callCount, 1);
        chai.assert.equal(conversation.getCall(0).args[0], id);
        chai.assert.equal(stubbedMessagesActions.updateSelectedMessage.callCount, 1);
        chai.assert.equal(stubbedMessagesActions.updateSelectedMessage.getCall(0).args[0].contact.doc.name, '');
        chai.assert.equal(stubbedMessagesActions.updateSelectedMessage.getCall(0).args[0].contact.doc.phone, phone);
      });
    });    
  });

});
