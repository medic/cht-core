import { createReducer, on } from '@ngrx/store';

import { Actions } from '../actions/messages';

export interface MessagesState {
  error: boolean;
  conversations: object[],
  messages: object[],
  selected: object;
}

const initialState: MessagesState = {
  error: false,
  conversations: [],
  messages: [],
  selected: null,
};

const setConversations = (state, newConversions) => {
  return { ...state, conversations: [...newConversions] };
};

const reducer = createReducer(
  initialState,
  on(Actions.setConversations, (state, { payload: { conversations } }) => setConversations(state, conversations)),
);

export function messagesReducer(state, action) {
  return reducer(state, action);
}
