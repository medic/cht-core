import { Component, OnDestroy, OnInit } from '@angular/core';
import { find as _find, isEqual as _isEqual } from 'lodash-es';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';

import { MessageContactService } from '@mm-services/message-contact.service';
import { GlobalActions } from '@mm-actions/global';
import { MessagesActions } from '@mm-actions/messages';
import { Selectors } from '@mm-selectors/index';
import { ChangesService } from '@mm-services/changes.service';
import { ExportService } from '@mm-services/export.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { isMobile } from '@mm-providers/responsive.provider';

@Component({
  templateUrl: './messages.component.html'
})
export class MessagesComponent implements OnInit, OnDestroy {
  private globalActions: GlobalActions;
  private messagesActions: MessagesActions;
  subscriptions: Subscription = new Subscription();

  loading = true;
  loadingContent = false;
  conversations = [];
  selectedConversation;
  error = false;

  constructor(
    private router: Router,
    private store: Store,
    private changesService: ChangesService,
    private messageContactService: MessageContactService,
    private exportService: ExportService,
    private modalService: ModalService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.messagesActions = new MessagesActions(store);
  }

  ngOnInit(): void {
    const selectorsSubscription = combineLatest(
      this.store.select(Selectors.getConversations),
      this.store.select(Selectors.getSelectedConversation),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getMessagesError),
    )
    .subscribe(([
      conversations = [],
      selectedConversation,
      loadingContent,
      error,
    ]) => {
      // Create new reference of conversation's items
      // because the ones from store can't be modified as they are read only.
      this.conversations = conversations.map(c => ({ ...c }));
      this.selectedConversation = selectedConversation;
      this.loadingContent = loadingContent;
      this.error = error;
    });
    this.subscriptions.add(selectorsSubscription);

    this.updateConversations().then(() => this.displayFirstConversation(this.conversations));
    this.watchForChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private displayFirstConversation(conversations = []) {
    if (isMobile()) {
      return;
    }

    const parts = this.router.url.split('/');
    const lastPart = parts[parts.length - 1];
    const [type, id] = lastPart ? lastPart.split(':') : [];

    if ((!type || !id) && conversations.length) {
      this.router.navigate(['/messages', `${conversations[0].type}:${conversations[0].key}`]);
    }
  }

  private watchForChanges() {
    const subscription = this.changesService.subscribe({
      key: 'messages-list',
      callback: () => this.updateConversations({ merge: true }),
      filter: change => this.messageContactService.isRelevantChange(change),
    });
    this.subscriptions.add(subscription);
  }

  private updateActionBar() {
    const leftActionBar = {
      hasResults: this.conversations && this.conversations.length > 0,
      exportFn: () => this.exportService.export('messages', {}, { humanReadable: true }),
      openSendMessageModal: (event) => this.openSendMessageModal(event)
    };
    this.globalActions.setLeftActionBar(leftActionBar);
  }

  private openSendMessageModal(event) {
    const target = $(event.target).closest('.send-message');

    if (target.hasClass('mm-icon-disabled')) {
      return;
    }

    event.preventDefault();
    this.modalService.show(SendMessageComponent);
  }

  private setConversations(conversations = [], {merge = false} = {}) {
    if (merge) {
      this.removeDeleted(this.conversations, conversations);
      this.mergeUpdated(this.conversations, conversations);
    }

    this.messagesActions.setConversations(conversations);
    this.updateActionBar();
  }

  updateConversations({merge = false} = {}) {
    return this.messageContactService
      .getList()
      .then((conversations = []) => {
        this.setConversations(conversations, { merge });
        this.loading = false;
      });
  }

  private removeDeleted(currentConversations = [], updatedConversations = []) {
    for (let i = currentConversations.length - 1; i >= 0; i--) {
      if (!updatedConversations.some(changed => currentConversations[i].key === changed.key)) {
        currentConversations.splice(i, 1);
      }
    }
  }

  private mergeUpdated(currentConversations = [], updatedConversations = []) {
    updatedConversations.forEach(updated => {
      const match = _find(currentConversations, existing => existing.key === updated.key);

      if (match) {
        if (!_isEqual(updated.message, match.message)) {
          match.message = updated.message;
          match.read = false;
        }
      } else {
        currentConversations.push(updated);
      }
    });
  }

  listTrackBy(index, message) {
    const identifier = message.doc ? message.doc.id + message.doc._rev : message.id;
    return message.key + identifier;
  }
}
