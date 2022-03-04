import { Store, createAction } from '@ngrx/store';

import { createSingleValueAction } from '@mm-actions/actionUtils';
import { GlobalActions } from '@mm-actions/global';

export const Actions = {
  setSelectedConversation: createSingleValueAction('SET_SELECTED_CONVERSATION', 'selected'),
  setConversations: createSingleValueAction('SET_CONVERSATIONS', 'conversations'),
  setMessagesError: createSingleValueAction('SET_MESSAGES_ERROR', 'error'),

  removeMessageFromSelectedConversation: createSingleValueAction('REMOVE_MESSAGE_FROM_SELECTED_CONVERSATION', 'id'),
  updateSelectedConversation: createSingleValueAction('UPDATE_SELECTED_CONVERSATION', 'selected'),
  markSelectedConversationRead: createAction('MARK_SELECTED_CONVERSATION_READ'),
};

export class MessagesActions {
  globalActions;

  constructor(
    private store: Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  setSelectedConversation(selected) {
    return this.store.dispatch(Actions.setSelectedConversation(selected));
  }

  setConversations(conversations) {
    return this.store.dispatch(Actions.setConversations(conversations));
  }

  setMessagesError(error) {
    return this.store.dispatch(Actions.setMessagesError(error));
  }

  removeMessageFromSelectedConversation(id) {
    return this.store.dispatch(Actions.removeMessageFromSelectedConversation(id));
  }

  updateSelectedConversation(selected) {
    return this.store.dispatch(Actions.updateSelectedConversation(selected));
  }

  setSelected(doc, refresh) {
    this.setSelectedConversation(doc);
    this.globalActions.settingSelected(refresh);
  }

  markSelectedConversationRead() {
    return this.store.dispatch(Actions.markSelectedConversationRead());
  }
}
