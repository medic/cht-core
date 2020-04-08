describe('Messages store', () => {
  'use strict';

  let messagesActions;
  let getState;
  let selectors;

  beforeEach(module('inboxApp'));

  const setupStore = initialState => {
    KarmaUtils.setupMockStore(initialState);
    inject(($ngRedux, MessagesActions, Selectors) => {
      messagesActions = MessagesActions($ngRedux.dispatch);
      getState = $ngRedux.getState;
      selectors = Selectors;
    });
  };

  const createMessagesState = state => ({ messages: state });

  it('sets selected conversation', () => {
    const initialState = createMessagesState({ selected: null });
    setupStore(initialState);
    const selected = {};
    messagesActions.setSelectedConversation(selected);
    const state = getState();
    const messagesState = selectors.getMessagesState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(messagesState).to.deep.equal({ selected });
  });

  it('updates selected conversation', () => {
    const initialState = createMessagesState({ selected: { doc: '1' } });
    setupStore(initialState);
    const selected = { doc: '2' };
    messagesActions.updateSelectedConversation(selected);
    const state = getState();
    const messagesState = selectors.getMessagesState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
    chai.expect(messagesState).to.deep.equal({ selected });
  });

  describe('should update selected conversation correctly', () => {
    it('adds a message to selected conversation', () => {
      const message1 = { id: '1' };
      const message2 = { id: '2' };
      const initialState = createMessagesState({ selected: { messages: [message1] } });
      setupStore(initialState);

      messagesActions.updateSelectedConversation({ messages: [message2] });

      const state = getState();
      const messagesState = selectors.getMessagesState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
      chai.expect(messagesState.selected.messages)
        .to.not.equal(selectors.getMessagesState(initialState).selected.messages);
      chai.expect(messagesState).to.deep.equal({ selected: { messages: [ message1, message2 ]} });
    });

    it('removes a message from selected conversation', () => {
      const message1 = { id: '1' };
      const message2 = { id: '2' };
      const initialState = createMessagesState({ selected: { messages: [message1, message2] } });
      setupStore(initialState);

      messagesActions.removeMessageFromSelectedConversation('1');

      const state = getState();
      const messagesState = selectors.getMessagesState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
      chai.expect(messagesState.selected.messages)
        .to.not.equal(selectors.getMessagesState(initialState).selected.messages);
      chai.expect(messagesState).to.deep.equal({ selected: { messages: [message2]} });
    });

    it('updates a message from the selected conversation', () => {
      const messages = [
        { id: 'message1' },
        { id: 'message2' },
        { id: 'message3' },
        { id: 'message4' },
      ];
      const initialState = createMessagesState({ selected: { messages } });
      setupStore(initialState);

      const newMessages = [
        { id: 'message1', updated: true },
        { id: 'message3', updated: true },
        { id: 'message5' },
      ];
      messagesActions.updateSelectedConversation({ messages: newMessages });

      const state = getState();
      const messagesState = selectors.getMessagesState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
      chai.expect(messagesState.selected.messages)
        .to.not.equal(selectors.getMessagesState(initialState).selected.messages);
      chai.expect(messagesState).to.deep.equal({
        selected: {
          messages: [
            { id: 'message1', updated: true },
            { id: 'message2' },
            { id: 'message3', updated: true },
            { id: 'message4' },
            { id: 'message5' },
          ]
        }
      });
    });

  });

});
