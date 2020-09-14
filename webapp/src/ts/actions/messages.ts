import { createAction, Store } from '@ngrx/store';

import { createSingleValueAction } from './actionUtils';

export const Actions = {
  addSelectedConversation: createSingleValueAction('SET_SELECTED_CONVERSATION', 'selected'),

  addConversations: createSingleValueAction('SET_CONVERSATIONS', 'conversations'),
};

export class MessagesActions {
  constructor(private store: Store) {}

  addSelectedConversation(selected) {
    return this.store.dispatch(Actions.addSelectedConversation(selected));
  }

  addConversations(conversations) {
    return this.store.dispatch(Actions.addConversations(conversations));
  }
}
