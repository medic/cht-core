import { createReducer, on } from '@ngrx/store';
import * as _ from 'lodash-es';

import { Actions } from '../actions/messages';

const initialState = {
  error: false,
  conversations: [],
  messages: [],
  selected: null,
};

const insertConversations = (state, newConversions) => {
  return { ...state, conversations: [...newConversions] };
};

const reducer = createReducer(
  initialState,
  on(Actions.addConversations, (state, { payload: { conversations } }) => insertConversations(state, conversations)),
);

export function messagesReducer(state, action) {
  return reducer(state, action);
}
