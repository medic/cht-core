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

  it('sets selected message', () => {
    const initialState = createMessagesState({ selected: null });
    setupStore(initialState);
    const selected = {};
    messagesActions.setSelectedMessage(selected);
    const state = getState();
    const messagesState = selectors.getMessagesState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(messagesState).to.deep.equal({ selected });
  });

  it('updates selected message', () => {
    const initialState = createMessagesState({ selected: { doc: '1' } });
    setupStore(initialState);
    const selected = { doc: '2' };
    messagesActions.updateSelectedMessage(selected);
    const state = getState();
    const messagesState = selectors.getMessagesState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
    chai.expect(messagesState).to.deep.equal({ selected });
  });

  it('adds a message to selected', () => {
    const message1 = { id: '1' };
    const message2 = { id: '2' };
    const initialState = createMessagesState({ selected: { messages: [message1] } });
    setupStore(initialState);

    messagesActions.addSelectedMessage(message2);

    const state = getState();
    const messagesState = selectors.getMessagesState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
    chai.expect(messagesState.selected.messages)
      .to.not.equal(selectors.getMessagesState(initialState).selected.messages);
    chai.expect(messagesState).to.deep.equal({ selected: { messages: [message1, message2]} });
  });

  it('removes a message from selected', () => {
    const message1 = { id: '1' };
    const message2 = { id: '2' };
    const initialState = createMessagesState({ selected: { messages: [message1, message2] } });
    setupStore(initialState);

    messagesActions.removeSelectedMessage('1');

    const state = getState();
    const messagesState = selectors.getMessagesState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(messagesState.selected).to.not.equal(selectors.getMessagesState(initialState).selected);
    chai.expect(messagesState.selected.messages)
      .to.not.equal(selectors.getMessagesState(initialState).selected.messages);
    chai.expect(messagesState).to.deep.equal({ selected: { messages: [message2]} });
  });

});
