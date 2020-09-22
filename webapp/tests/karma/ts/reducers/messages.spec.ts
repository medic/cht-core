import { expect } from 'chai';

import { Actions } from '@mm-actions/messages';
import { messagesReducer, MessagesState } from '@mm-reducers/messages';

describe('Messages Reducer', () => {
  let state: MessagesState;

  beforeEach(() => {
    state = {
      error: false,
      conversations: [],
      messages: [],
      selected: null,
    };
  });

  it('should set initial state and add data when latest state not provided', () => {
    const data = [{id: '124'}, {id: '567'}];
    const action = Actions.setConversations(data);
    const expectedState = {
      conversations: [{id: '124'}, {id: '567'}],
      error: false,
      messages: [],
      selected: null
    };

    const result = messagesReducer(undefined, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should not modify state when action not recognized', () => {
    const action = { type: 'UNKNOWN' };
    const expectedState = {
      conversations: [],
      error: false,
      messages: [],
      selected: null
    };

    const result = messagesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });

  it('should add conversations to state when latest state provided', () => {
    const data = [{id: '124', date: 111}, {id: '567', date: 444}];
    const action = Actions.setConversations(data);
    const expectedState = {
      conversations: [{id: '567', date: 444}, {id: '124', date: 111}],
      error: false,
      messages: [],
      selected: null
    };

    const result = messagesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });
});
