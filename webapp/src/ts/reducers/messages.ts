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
  const conversations = newConversions ? [...newConversions].sort((a, b) => b.date - a.date) : [];
  return { ...state, conversations };
};

const setSelectedConversation = (state, selected) => {
  return { ...state, selected };
};

const setMessagesError = (state, error) => {
  return { ...state, error };
};

const removeMessageFromSelectedConversation = (state, id) => {
  const filteredMessages = state.selected.messages
    .filter(message => message.id !== id);

  return { ...state, selected: { ...state.selected, messages: filteredMessages } };
};

const updateSelectedConversation = (state, selected) => {
  const mergedMessages = [...((state.selected && state.selected.messages) || [])];

  selected.messages.forEach(updated => {
    const index = mergedMessages.findIndex(existent => updated.id === existent.id);
    if (index > -1) {
      // overwrite updated messages
      mergedMessages[index] = { ...updated };
    } else {
      mergedMessages.push({ ...updated });
    }
  });

  return { ...state, selected: { ...state.selected, ...selected, messages: mergedMessages } };
};

const reducer = createReducer(
  initialState,
  on(Actions.setSelectedConversation, (state, { payload: { selected } }) => setSelectedConversation(state, selected)),
  on(Actions.setConversations, (state, { payload: { conversations } }) => setConversations(state, conversations)),
  on(Actions.setMessagesError, (state, { payload: { error } }) => setMessagesError(state, error)),
  on(Actions.removeMessageFromSelectedConversation, (state, { payload: { id } }) => removeMessageFromSelectedConversation(state, id)),
  on(Actions.updateSelectedConversation, (state, { payload: { selected } }) => updateSelectedConversation(state, selected)),
);

export function messagesReducer(state, action) {
  return reducer(state, action);
}
