import { createReducer, on } from '@ngrx/store';

import { Actions } from '@mm-actions/messages';
import { Actions as GlobalActions } from '@mm-actions/global';

export interface MessagesState {
  error: boolean;
  conversations: object[];
  selected: object | null;
}

const initialState: MessagesState = {
  error: false,
  conversations: [],
  selected: null,
};

const sortMessages = (a, b) => {
  return a.doc?.reported_date - b.doc?.reported_date;
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
    .filter(message => message.id !== id)
    .sort(sortMessages);

  return { ...state, selected: { ...state.selected, messages: filteredMessages } };
};

const updateSelectedConversation = (state, selected) => {
  let mergedMessages = [...((state.selected && state.selected.messages) || [])];

  selected.messages.forEach(updated => {
    const index = mergedMessages.findIndex(existent => updated.id === existent.id);
    if (index > -1) {
      // overwrite updated messages
      mergedMessages[index] = { ...updated };
    } else {
      mergedMessages.push({ ...updated });
    }
  });

  mergedMessages = mergedMessages.sort(sortMessages);

  return { ...state, selected: { ...state.selected, ...selected, messages: mergedMessages } };
};

const markSelectedConversationRead = (state) => {
  if (!state.conversations || !state.selected?.messages) {
    return state;
  }

  const ids = state.selected.messages.map(message => message.doc._id);
  const updatedConversations = state.conversations.map(conversation => {
    if (ids.includes(conversation.id)) {
      conversation = { ...conversation, read: true };
    }
    return conversation;
  });

  return { ...state, conversations: updatedConversations };
};

const reducer = createReducer(
  initialState,
  on(Actions.setSelectedConversation, (state, { payload: { selected } }) => setSelectedConversation(state, selected)),
  on(Actions.setConversations, (state, { payload: { conversations } }) => setConversations(state, conversations)),
  on(Actions.setMessagesError, (state, { payload: { error } }) => setMessagesError(state, error)),
  on(Actions.removeMessageFromSelectedConversation, (state, { payload: { id } }) => {
    return removeMessageFromSelectedConversation(state, id);
  }),
  on(Actions.updateSelectedConversation, (state, { payload: { selected } }) => {
    return updateSelectedConversation(state, selected);
  }),
  on(GlobalActions.clearSelected, (state) => setSelectedConversation(state, null)),
  on(Actions.markSelectedConversationRead, (state) => markSelectedConversationRead(state)),
);

export const messagesReducer = (state, action) => {
  return reducer(state, action);
};
