import { AfterContentInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { minBy as _minBy } from 'lodash-es';

import { GlobalActions } from '@mm-actions/global';
import { MessagesActions } from '@mm-actions/messages';
import { Selectors } from '@mm-selectors/index';
import { ChangesService } from '@mm-services/changes.service';
import { MessageContactService } from '@mm-services/message-contact.service';
import { SessionService } from '@mm-services/session.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { MarkReadService } from '@mm-services/mark-read.service';

/**
*  In this context the URL parameter "id", can be:
*    - the _id of the contact who is sending these messages
*    - the phone number if it couldn't be resolved into a contact
*    - the _id of the data_record if there is no discernible phone number
*  This is determined by the URL parameter "type": 'contact', 'phone' or 'unknown' respectively.
*/
@Component({
  selector: 'messages-content',
  templateUrl: './messages-content.component.html'
})
export class MessagesContentComponent implements OnInit, OnDestroy, AfterContentInit {
  private userCtx;
  private globalActions: GlobalActions;
  private messagesActions: MessagesActions;

  loadingContent;
  loadingMoreContent = false;
  selectedConversation;
  firstUnread;
  send = { message: '' };
  allLoaded = false;
  // _testSelect; // See URL param "id" note at top of file. Promise exposed solely for testing purposes
  parameters = { type: '', id: '' };
  subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private changesService: ChangesService,
    private messageContactService: MessageContactService,
    private sessionService: SessionService,
    private lineageModelGeneratorService: LineageModelGeneratorService,
    private markReadService: MarkReadService
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getSelectedConversation)),
      this.store.pipe(select(Selectors.getLoadingContent)),
    ).subscribe(([selectedConversation, loadingContent]) => {
      this.selectedConversation = selectedConversation;
      this.loadingContent = loadingContent;
    });
    this.subscriptions.add(subscription);

    this.globalActions = new GlobalActions(store);
    this.messagesActions = new MessagesActions(store, this.globalActions);
    this.userCtx = this.sessionService.userCtx();
  }

  ngOnInit(): void {
    const subscription = this.route.params.subscribe(params => {
      const parts = params.type_id.split(':');
      this.parameters.type = parts[0];
      this.parameters.id = parts[1];
      // See URL param "id" note at top of file.
      this.selectContact(this.parameters.id, this.parameters.type);
    });
    this.subscriptions.add(subscription);

    this.watchForChanges();
  }

  ngAfterContentInit(): void {
    window.jQuery('.tooltip').remove();
    window.jQuery('body')
      .on('focus', '#message-footer textarea', () => {
        window.jQuery('#message-footer').addClass('sending');
      })
      .on('blur', '#message-footer textarea', () => {
        window.jQuery('#message-footer').removeClass('sending');
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    window.jQuery('body').off('focus', '#message-footer textarea');
    window.jQuery('body').off('blur', '#message-footer textarea');
  }

  listTrackBy(index, message) {
    const identifier = message.doc ? message.doc.id + message.doc._rev : message.id;
    return message.key + identifier;
  }

  private checkScroll(elem) {
    if (elem && elem.scrollTop === 0 && !this.allLoaded) {
      this.updateConversation({ skip: true });
    }
  }

  private scrollToUnread() {
    const content = window.jQuery('.message-content-wrapper');
    const markers = content.find('.marker');
    let scrollTo = markers.length ? markers[0].offsetTop - 50 : content[0].scrollHeight;

    content.scrollTop(scrollTo);
    window.jQuery('.message-content-wrapper').on('scroll', () => this.checkScroll(content));
  }

  // See URL parameter "id" note at top of file
  private getContactable(id, type) {
    if (type === 'contact') {
      return this.lineageModelGeneratorService
        .contact(id)
        .catch(err => {
          if (err.code === 404) {
            return;
          }
          throw err;
        });
    }

    if (type === 'phone') {
      return { name: id };
    }

    return {};
  }

  private markConversationReadIfNeeded() {
    const hasUnreadDoc = this.selectedConversation.messages.some(message => !message.read && message.doc);

    if (hasUnreadDoc) {
      const docs = this.selectedConversation.messages.map(message => message.doc);
      this.markReadService
        .markAsRead(docs)
        .then(() => {
          this.messagesActions.markSelectedConversationRead();
        })
        .catch(err => console.error('Error marking all as read', err));
    }
  }

  private selectContact(id, type) {
    if (!id) {
      this.messagesActions.setMessagesError(false);
      this.globalActions.setLoadingContent(false);
      this.globalActions.unsetSelected();
      return;
    }

    // ToDo: not sure if needed -> window.jQuery('.message-content-wrapper').off('scroll', () => this.checkScroll());
    const refreshSelected = this.selectedConversation && this.selectedConversation.id === id;
    this.messagesActions.setSelected({ id: id, messages: [] }, refreshSelected);
    this.globalActions.setLoadingShowContent(id);

    return Promise
      .all([
        this.getContactable(id, type),
        this.messageContactService.getConversation(id)
      ])
      .then(([contactModel, conversation]) => {
        if (!contactModel && conversation.length) {
          const firstTaskWithContact = conversation[0].doc.tasks.find((task) => {
            const message = task.messages && task.messages[0];
            return message && message.contact && message.contact._id === id;
          });

          const firstMessageWithContact = firstTaskWithContact.messages.find(message => message.contact._id === id);
          contactModel = {
            doc: {
              name: '',
              phone: firstMessageWithContact.to
            }
          };
        }

        if (this.selectedConversation && this.selectedConversation.id !== id) {
          // ignore response for previous request
          return;
        }

        this.globalActions.setLoadingShowContent(false);
        this.messagesActions.setMessagesError(false);
        const unread = conversation.filter(message => !message.read);
        this.firstUnread = _minBy(unread, message => message.doc.reported_date);
        this.messagesActions.updateSelectedConversation({ contact: contactModel, messages: conversation });
        this.globalActions.setTitle((contactModel && contactModel.doc && contactModel.doc.name) || id);
        this.markConversationReadIfNeeded();
        setTimeout(() => this.scrollToUnread()); // Todo $timeout();
      })
      .catch((err) => {
        this.globalActions.setLoadingContent(false);
        this.messagesActions.setMessagesError(true);
        console.error('Error fetching contact conversation', err);
      });
  }

  private updateConversation(options: any = {}) {
    const selectedId = this.selectedConversation && this.selectedConversation.id;
    if (!selectedId) {
      return;
    }

    if (options.change && options.change.deleted) {
      return this.messagesActions.removeMessageFromSelectedConversation(options.change.id);
    }

    const skip = options.skip && this.selectedConversation.messages.length;
    const limit = !options.skip && this.selectedConversation.messages.length;

    if (skip) {
      this.loadingMoreContent = true; // ToDo => $timeout(() => );
    }

    return this.messageContactService
      .getConversation(selectedId, skip, limit)
      .then((conversation) => {
        this.loadingMoreContent = false;

        const newMessageFromUser = conversation.find(message => (
          message.doc.sent_by === this.userCtx.name &&
          !this.selectedConversation.messages.find(existent => existent.id === message.id)
        ));

        this.messagesActions.updateSelectedConversation({ messages: conversation });

        if (options.skip) {
          this.allLoaded = conversation.length < this.messageContactService.minLimit;
          this.firstUnread = null;
        }

        const first = window.jQuery('.item-content .body #message-content ul > li').filter(':first');
        this.markConversationReadIfNeeded();

        let scroll: number | boolean = false; // ToDo, revisit typing and $timeout(() { }); !!!!!
        if (options.skip) {
          const spinnerHeight = 102;
          scroll = window.jQuery('.message-content-wrapper li')[conversation.length].offsetTop - spinnerHeight;
        } else if (first.length && newMessageFromUser) {
          scroll = window.jQuery('.message-content-wrapper')[0].scrollHeight;
        }

        if (scroll) {
          window.jQuery('.message-content-wrapper').scrollTop(scroll);
        }
      })
      .catch(err => console.error('Error fetching contact conversation', err));
  }

  private watchForChanges() {
    const subscription = this.changesService.subscribe({
      key: 'messages-content',
      callback: change => this.updateConversation({ change }),
      filter: change => this.messageContactService.isRelevantChange(change, this.selectedConversation),
    });
    this.subscriptions.add(subscription);
  }

}
