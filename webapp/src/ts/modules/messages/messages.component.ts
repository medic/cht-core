import { Component, OnDestroy, OnInit } from '@angular/core';
import { find as _find, isEqual as _isEqual } from 'lodash-es';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { MessageContactService } from '@mm-services/message-contact.service';
import { GlobalActions } from '@mm-actions/global';
import { MessagesActions } from '@mm-actions/messages';
import { Selectors } from '@mm-selectors/index';
import { ChangesService } from '@mm-services/changes.service';
import { ExportService } from '@mm-services/export.service';
import { ModalService } from '@mm-services/modal.service';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { ResponsiveService } from '@mm-services/responsive.service';
import { FastAction, FastActionButtonService } from '@mm-services/fast-action-button.service';
import { PerformanceService } from '@mm-services/performance.service';
import { ButtonType, FastActionButtonComponent } from '@mm-components/fast-action-button/fast-action-button.component';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';
import { MessagesMoreMenuComponent } from '@mm-modules/messages/messages-more-menu.component';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LineagePipe } from '@mm-pipes/message.pipe';
import { RelativeDatePipe } from '@mm-pipes/date.pipe';

@Component({
  templateUrl: './messages.component.html',
  imports: [
    ToolBarComponent,
    MessagesMoreMenuComponent,
    NgIf,
    NgFor,
    NgClass,
    RouterLink,
    FastActionButtonComponent,
    RouterOutlet,
    TranslatePipe,
    LineagePipe,
    RelativeDatePipe
  ]
})
export class MessagesComponent implements OnInit, OnDestroy {
  private globalActions: GlobalActions;
  private messagesActions: MessagesActions;
  private destroyed = false;
  readonly buttonType = ButtonType;

  subscriptions: Subscription = new Subscription();
  fastActionList?: FastAction[];
  loading = true;
  loadingContent = false;
  conversations: Record<string, any>[] = [];
  error = false;
  trackPerformance;

  constructor(
    private readonly router: Router,
    private readonly store: Store,
    private readonly changesService: ChangesService,
    private readonly fastActionButtonService: FastActionButtonService,
    private readonly messageContactService: MessageContactService,
    private readonly exportService: ExportService,
    private readonly modalService: ModalService,
    private readonly responsiveService: ResponsiveService,
    private readonly performanceService: PerformanceService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.messagesActions = new MessagesActions(store);
  }

  ngOnInit() {
    this.trackPerformance = this.performanceService.track();
    this.subscribeToStore();
    this.updateConversations().then(() => this.displayFirstConversation(this.conversations));
    this.watchForChanges();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.subscriptions.unsubscribe();
    this.globalActions.unsetSelected();
    this.messagesActions.setConversations([]);
  }

  private subscribeToStore() {
    const assignments$ = combineLatest([
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getMessagesError),
    ]).subscribe(([
      loadingContent,
      error,
    ]) => {
      this.loadingContent = loadingContent;
      this.error = error;
    });
    this.subscriptions.add(assignments$);

    const conversations$ = combineLatest([
      this.store.select(Selectors.getConversations),
      this.store.select(Selectors.getSelectedConversation),
    ]).subscribe(([
      conversations = [],
      selectedConversation,
    ]) => {
      // Make new reference because the one from store is read-only. Fixes: ExpressionChangedAfterItHasBeenCheckedError
      this.conversations = conversations.map(conversation => {
        return { ...conversation, selected: conversation.key === selectedConversation?.id };
      });
    });
    this.subscriptions.add(conversations$);
  }

  private displayFirstConversation(conversations: Record<string, any>[] = []) {
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

  private async updateFastActions() {
    if (this.destroyed) {
      // Don't update the fast actions, if the component has already been destroyed
      // This callback can be queued up and persist even after component destruction
      return;
    }

    this.fastActionList = await this.fastActionButtonService.getMessageActions({
      callbackOpenSendMessage: () => this.modalService.show(SendMessageComponent),
    });
  }

  private openSendMessageModal(modalService:ModalService, event) {
    const target = $(event.target).closest('.send-message');

    if (target.hasClass('mm-icon-disabled')) {
      return;
    }

    event.preventDefault();
    modalService.show(SendMessageComponent);
  }

  private setConversations(conversations: Record<string, any>[] = [], {merge = false} = {}) {
    if (merge) {
      this.removeDeleted(this.conversations, conversations);
      this.mergeUpdated(this.conversations, conversations);
    }

    this.messagesActions.setConversations(conversations);
    this.updateFastActions();
    this.recordPerformance();
  }

  private async recordPerformance() {
    if (!this.trackPerformance) {
      return;
    }
    await this.trackPerformance.stop({ name: 'message_list:load', recordApdex: true });
    this.trackPerformance = null;
  }

  updateConversations({ merge = false } = {}) {
    return this.messageContactService
      .getList()
      .then(conversations => {
        this.setConversations(conversations, { merge });
        this.loading = false;
      });
  }

  private removeDeleted(
    currentConversations: Record<string, any>[] = [],
    updatedConversations: Record<string, any>[] = []
  ) {
    for (let i = currentConversations.length - 1; i >= 0; i--) {
      if (!updatedConversations.some(changed => currentConversations[i].key === changed.key)) {
        currentConversations.splice(i, 1);
      }
    }
  }

  private mergeUpdated(
    currentConversations: Record<string, any>[] = [],
    updatedConversations: Record<string, any>[] = []
  ) {
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

  exportMessages() {
    this.exportService.export('messages', {}, { humanReadable: true });
  }
}
