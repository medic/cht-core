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
    chai.expect(messagesState).to.deep.equal({ selected: { messages: [ message2, message1 ]} });
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

  it('should update selected conversation correctly', () => {
    // todo
  });

});
