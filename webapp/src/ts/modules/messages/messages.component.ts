import { Component, OnDestroy, OnInit } from '@angular/core';
import { find as _find, isEqual as _isEqual } from 'lodash-es';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';

import { MessageContactService } from '@mm-services/message-contact.service';
import { GlobalActions } from '@mm-actions/global';
import { MessagesActions } from '@mm-actions/messages';
import { Selectors } from '@mm-selectors/index';
import { ChangesService } from '@mm-services/changes.service';
import { ExportService } from '@mm-services/export.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { TourService } from '@mm-services/tour.service';
import { ResponsiveService } from '@mm-services/responsive.service';

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
  selectedConversationId = null;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private changesService: ChangesService,
    private messageContactService: MessageContactService,
    private exportService: ExportService,
    private modalService: ModalService,
    private tourService: TourService,
    private responsiveService: ResponsiveService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.messagesActions = new MessagesActions(store);
  }

  ngOnInit(): void {
    this.subscribeToRouter();
    this.subscribeToStore();
    this.tourService.startIfNeeded(this.route.snapshot);
    this.updateConversations().then(() => this.displayFirstConversation(this.conversations));
    this.watchForChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.globalActions.unsetSelected();
  }

  private reset() {
    this.selectedConversationId = null;
  }

  private subscribeToRouter() {
    const subscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // Resetting values at this point prevents "Expression __ has changed after it was checked" exception.
        this.reset();
      }
    });
    this.subscriptions.add(subscription);
  }

  private subscribeToStore() {
    const subscription = combineLatest(
      this.store.select(Selectors.getConversations),
      this.store.select(Selectors.getSelectedConversation),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getMessagesError),
    ).subscribe(([
      conversations = [],
      selectedConversation,
      loadingContent,
      error,
    ]) => {
      // Create new reference of conversation's items
      // because the ones from store can't be modified as they are read only.
      this.conversations = conversations.map(conversation => ({ ...conversation }));
      this.loadingContent = loadingContent;
      this.error = error;
      this.selectedConversationId = selectedConversation?.id;
    });
    this.subscriptions.add(subscription);
  }

  private displayFirstConversation(conversations = []) {
    if (this.responsiveService.isMobile()) {
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
      exportFn: this.exportFn.bind({}, this.exportService),
      openSendMessageModal: this.openSendMessageModal.bind({}, this.modalService),
    };
    this.globalActions.setLeftActionBar(leftActionBar);
  }

  private exportFn(exportService:ExportService) {
    exportService.export('messages', {}, { humanReadable: true });
  }

  private openSendMessageModal(modalService:ModalService, event) {
    const target = $(event.target).closest('.send-message');

    if (target.hasClass('mm-icon-disabled')) {
      return;
    }

    event.preventDefault();
    modalService
      .show(SendMessageComponent)
      .catch(() => {});
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
