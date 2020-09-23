import { Store } from '@ngrx/store';

import { createSingleValueAction } from './actionUtils';

export const Actions = {
  setSelectedConversation: createSingleValueAction('SET_SELECTED_CONVERSATION', 'selected'),

  setConversations: createSingleValueAction('SET_CONVERSATIONS', 'conversations'),
};

export class MessagesActions {
  constructor(private store: Store) {}

  setSelectedConversation(selected) {
    return this.store.dispatch(Actions.setSelectedConversation(selected));
  }

  setConversations(conversations) {
    return this.store.dispatch(Actions.setConversations(conversations));
  }
}
