import { expect } from 'chai';

import { Actions } from '@mm-actions/messages';
import { Actions as GlobalActions } from '@mm-actions/global';
import { messagesReducer, MessagesState } from '@mm-reducers/messages';

describe('Messages Reducer', () => {
  let state: MessagesState;

  beforeEach(() => {
    state = {
      error: false,
      conversations: [],
      selected: undefined,
    };
  });

  it('should set initial state and add data when latest state not provided', () => {
    const data = [{id: '124'}, {id: '567'}];
    const action = Actions.setConversations(data);
    const expectedState = {
      conversations: [{id: '124'}, {id: '567'}],
      error: false
    };

    const result = messagesReducer(undefined, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should not modify state when action not recognized', () => {
    const action = { type: 'UNKNOWN' };
    const expectedState = {
      conversations: [],
      error: false
    };

    const result = messagesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should set a list of conversations in state when latest state provided', () => {
    const data = [{id: '124', date: 111}, {id: '567', date: 444}];
    const action = Actions.setConversations(data);
    const expectedState = {
      conversations: [{id: '567', date: 444}, {id: '124', date: 111}],
      error: false
    };

    const result = messagesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should set the selected conversation in state', () => {
    const data = {id: '124', date: 111};
    const action = Actions.setSelectedConversation(data);
    const expectedState = {
      conversations: [],
      error: false,
      selected: {id: '124', date: 111}
    };

    const result = messagesReducer(state, action);

    expect(result.selected).to.not.equal(null);
    expect(result).to.deep.include(expectedState);
  });

  it('should set error in state', () => {
    const data = true;
    const action = Actions.setMessagesError(data);
    const expectedState = {
      conversations: [],
      error: true
    };

    const result = messagesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should remove message from selected conversation in the state', () => {
    const data = 'm567';
    const action = Actions.removeMessageFromSelectedConversation(data);
    const expectedState = {
      conversations: [],
      error: false,
      selected: {id: '124', date: 111, messages: [{id: 'm123'}]}
    };
    state.selected = {id: '124', date: 111, messages: [{id: 'm123'}, {id: 'm567'}]};

    const result = messagesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should clear selected conversation in the state', () => {
    const action = GlobalActions.clearSelected();
    const expectedState = {
      conversations: [],
      error: false
    };
    state.selected = {id: '124', date: 111};

    const result = messagesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should mark selected conversation as read in the state', () => {
    const action = Actions.markSelectedConversationRead();
    const conversation = {id: '124', date: 111, messages: [{doc: {_id: '124'}}]};
    const expectedState = {
      conversations: [{ ...conversation, read: true }],
      error: false,
      selected: conversation
    };
    state.conversations = [conversation];
    state.selected = conversation;

    const result = messagesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  describe('update selected conversation', () => {
    it('should update selected conversation in the state', () => {
      const data = { id: '124', date: 555, messages: [ {id: 'm123'} ] };
      const action = Actions.updateSelectedConversation(data);
      const expectedState = {
        conversations: [],
        error: false,
        selected: { id: '124', date: 555, messages: [ { id: 'm123' } ] }
      };
      const oldSelected = { id: '124', date: 111 };
      state.selected = oldSelected;

      const result = messagesReducer(state, action);

      expect(result.selected).to.not.deep.include(oldSelected);
      expect(result).to.deep.include(expectedState);
    });

    it('should add a message to selected conversation', () => {
      const message1 = { id: '1', doc: { reported_date: 1 } };
      const message2 = { id: '2', doc: { reported_date: 2 } };
      const data = { id: '124', messages: [ message2 ] };
      const action = Actions.updateSelectedConversation(data);
      const expectedState = {
        conversations: [],
        error: false,
        selected: { id: '124', messages: [ message1, message2 ] }
      };
      const oldSelected = { id: '124', messages: [ message1 ] };
      state.selected = oldSelected;

      const result = messagesReducer(state, action);

      expect(result.selected).to.not.deep.include(oldSelected);
      expect(result).to.deep.include(expectedState);
    });

    it('should remove a message from selected conversation', () => {
      const message1 = { id: '1', doc: { reported_date: 1 } };
      const message2 = { id: '2', doc: { reported_date: 2 } };
      const action = Actions.removeMessageFromSelectedConversation('1');
      const expectedState = {
        conversations: [],
        error: false,
        selected: { id: '124', messages: [ message2 ] }
      };
      const oldSelected = { id: '124', messages: [ message1, message2 ] };
      state.selected = oldSelected;

      const result = messagesReducer(state, action);

      expect(result.selected).to.not.deep.include(oldSelected);
      expect(result).to.deep.include(expectedState);
    });

    it('should update a message from the selected conversation', () => {
      const messages = [
        { id: '1', doc: { reported_date: 1 } },
        { id: '2', doc: { reported_date: 2 } },
        { id: '3', doc: { reported_date: 3 } },
        { id: '4', doc: { reported_date: 4 } },
      ];
      const data = {
        id: '124',
        messages: [
          { id: '1', doc: { reported_date: 1 }, updated: true },
          { id: '3', doc: { reported_date: 3 }, updated: true },
          { id: '5', doc: { reported_date: 5 } },
        ]
      };
      const action = Actions.updateSelectedConversation(data);
      const expectedState = {
        conversations: [],
        error: false,
        selected: {
          id: '124',
          messages: [
            { id: '1', doc: { reported_date: 1 }, updated: true },
            { id: '2', doc: { reported_date: 2 } },
            { id: '3', doc: { reported_date: 3 }, updated: true },
            { id: '4', doc: { reported_date: 4 } },
            { id: '5', doc: { reported_date: 5 } },
          ]
        }
      };
      const oldSelected = { id: '124', messages };
      state.selected = oldSelected;

      const result = messagesReducer(state, action);

      expect(result.selected).to.not.deep.include(oldSelected);
      expect(result).to.deep.include(expectedState);
    });
  });
});
