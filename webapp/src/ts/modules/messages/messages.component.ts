import { Component, OnDestroy, OnInit } from '@angular/core';
import * as _ from 'lodash-es';
import { combineLatest, Subscription } from 'rxjs';
import { select, Store } from '@ngrx/store';

import { MessageContactService } from '@mm-services/message-contact.service';
import { GlobalActions } from '@mm-actions/global';
import { MessagesActions } from '@mm-actions/messages';
import { Selectors } from '@mm-selectors/index';
import { ChangesService } from '@mm-services/changes.service';

@Component({
  templateUrl: './messages.component.html'
})
export class MessagesComponent implements OnInit, OnDestroy {
  private globalActions: GlobalActions;
  private messagesActions: MessagesActions;
  subscriptions: Subscription = new Subscription();

  loading = false;
  loadingContent;
  conversations = [];
  selectedConversation;
  error;

  constructor(
    private store: Store,
    private changesService: ChangesService,
    private messageContactService: MessageContactService
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getConversations)),
      this.store.pipe(select(Selectors.getSelectedConversation)),
      this.store.pipe(select(Selectors.getLoadingContent)),
      this.store.pipe(select(Selectors.getMessagesError)),
    ).subscribe(([
      conversations,
      selectedConversation,
      loadingContent,
      error,
    ]) => {
      this.selectedConversation = selectedConversation;
      this.conversations = conversations;
      this.loadingContent = loadingContent;
      this.error = error;
    });
    this.subscriptions.add(subscription);

    this.globalActions = new GlobalActions(store);
    this.messagesActions = new MessagesActions(store);
  }

  ngOnInit(): void {
    this.updateConversations();
    this.watchForChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  watchForChanges() {
    const subscription = this.changesService.subscribe({
      key: 'messages-list',
      callback: () => this.updateConversations({ merge: true }),
      filter: change => this.messageContactService.isRelevantChange(change),
    });
    this.subscriptions.add(subscription);
  }

  updateActionBar() {
    /* ToDo: this.globalActions.setLeftActionBar({
      hasResults: this.conversations && this.conversations.length > 0,
      exportFn: () => Export('messages', {}, { humanReadable: true })
    });*/
  }

  setConversations(conversations = [], {merge = false} = {}) {
    if (merge) {
      this.removeDeleted(this.conversations, conversations);
      this.mergeUpdated(this.conversations, conversations);
    }

    this.messagesActions.addConversations(conversations);
    this.updateActionBar();
  }

  updateConversations({merge = false} = {}) {
    this.loading = true;

    return this.messageContactService
      .getList()
      .then(conversations => {
        this.setConversations(conversations, { merge });
        this.loading = false;
      });
  }

  removeDeleted(currentConversations, updatedConversations) {
    for (let i = currentConversations.length - 1; i >= 0; i--) {
      if (!updatedConversations.some(changed => currentConversations[i].key === changed.key)) {
        currentConversations.splice(i, 1);
      }
    }
  }

  mergeUpdated(currentConversations, updatedConversations) {
    updatedConversations.forEach(updated => {
      const match = _.find(currentConversations, existing => existing.key === updated.key);

      if (match) {
        if (!_.isEqual(updated.message, match.message)) {
          match.message = updated.message;
          match.read = false;
        }
      } else {
        currentConversations.push(updated);
      }
    });
  }

  listTrackBy(index, message) {
    return message.key + message.doc._rev;
  }
}
