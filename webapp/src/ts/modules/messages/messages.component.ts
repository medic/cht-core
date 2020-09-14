import { Component, OnDestroy, OnInit } from '@angular/core';
import * as _ from 'lodash-es';
import { combineLatest, Subscription } from 'rxjs';
import { select, Store } from '@ngrx/store';

import { MessageContactService } from '../../services/message-contact.service';
import { GlobalActions } from '../../actions/global';
import { MessagesActions } from '../../actions/messages';
import { Selectors } from '../../selectors';
import { ChangesService } from '../../services/changes.service';

@Component({
  templateUrl: './messages.component.html'
})
export class MessagesComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  private globalActions: GlobalActions;
  private messagesActions: MessagesActions;

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
      this.store.pipe(select(Selectors.getSelectedConversation)),
      this.store.pipe(select(Selectors.getConversations)),
      this.store.pipe(select(Selectors.getLoadingContent)),
      this.store.pipe(select(Selectors.getMessagesError)),
    ).subscribe(([
      selectedConversation,
      conversations,
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

  setConversations(messages = [], {merge = false} = {}) {
    if (merge) {
      this.removeDeleted(this.conversations, messages);
      this.mergeUpdated(this.conversations, messages);
    }

    this.messagesActions.addConversations(messages);
    this.updateActionBar();
  }

  updateConversations({merge = false} = {}) {
    this.loading = true;

    return this.messageContactService
      .getList()
      .then(messages => {
        this.setConversations(messages, { merge });
        this.loading = false;
      });
  }

  removeDeleted(conversations, changedMessages) {
    for (let i = conversations.length - 1; i >= 0; i--) {
      if (!changedMessages.some(changed => conversations[i].key === changed.key)) {
        conversations.splice(i, 1);
      }
    }
  }

  mergeUpdated(conversations, changedMessages) {
    changedMessages.forEach(updated => {
      const match = _.find(conversations, existing => existing.key === updated.key);

      if (match) {
        if (!_.isEqual(updated.message, match.message)) {
          match.message = updated.message;
          match.read = false;
        }
      } else {
        conversations.push(updated);
      }
    });
  }

  listTrackBy(index, message) {
    return message.key + message.doc._rev;
  }
}
