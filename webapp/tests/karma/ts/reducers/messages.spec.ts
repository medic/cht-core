import { expect } from 'chai';

import { Actions } from '../../../../src/ts/actions/messages';
import { messagesReducer, MessagesState } from '../../../../src/ts/reducers/messages';

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
    const action = Actions.addConversations(data);
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
    const data = [{id: '124'}, {id: '567'}];
    const action = Actions.addConversations(data);
    const expectedState = {
      conversations: [{id: '124'}, {id: '567'}],
      error: false,
      messages: [],
      selected: null
    };

    const result = messagesReducer(state, action);

    expect(result).to.deep.include(expectedState);
  });
});
