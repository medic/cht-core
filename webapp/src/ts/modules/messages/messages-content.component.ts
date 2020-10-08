import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
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
import { SendMessageService } from '@mm-services/send-message.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';

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
export class MessagesContentComponent implements OnInit, OnDestroy, AfterViewInit {
  private userCtx;
  private globalActions: GlobalActions;
  messagesActions: MessagesActions;

  loadingContent;
  loadingMoreContent = false;
  selectedConversation;
  firstUnread;
  send = { message: '' };
  allLoaded = false;
  urlParameters = { type: '', id: '' };
  subscriptions: Subscription = new Subscription();
  textAreaFocused = false;

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private changesService: ChangesService,
    private messageContactService: MessageContactService,
    private sessionService: SessionService,
    private lineageModelGeneratorService: LineageModelGeneratorService,
    private markReadService: MarkReadService,
    private sendMessageService: SendMessageService,
    private modalService: ModalService,
  ) {
    const selectorsSubscription = combineLatest(
      this.store.pipe(select(Selectors.getSelectedConversation)),
      this.store.pipe(select(Selectors.getLoadingContent)),
    ).subscribe(([selectedConversation, loadingContent]) => {
      this.selectedConversation = selectedConversation;
      this.loadingContent = loadingContent;
    });
    this.subscriptions.add(selectorsSubscription);

    this.globalActions = new GlobalActions(store);
    this.messagesActions = new MessagesActions(store, this.globalActions);
  }

  ngOnInit(): void {
    this.userCtx = this.sessionService.userCtx();
    this.watchForChanges();
  }

  ngAfterViewInit(): void {
    const routeSubscription = this.route.params.subscribe(params => {
      const [type, id] = params.type_id ? params.type_id.split(':') : [];
      this.urlParameters.type = type;
      this.urlParameters.id = id;
      this.send.message = '';
      // Setting Timeout to select contact right after all the initialization hooks of Angular are done.
      setTimeout(() => this.selectContact(this.urlParameters.id, this.urlParameters.type));
    });
    this.subscriptions.add(routeSubscription);

    // Ensuring that any Bootstrap tooltip is removed when loading new conversation.
    $('.tooltip').remove();
    $('body')
      .on('focus', '#message-footer textarea', () => {
        this.textAreaFocused = true;
      })
      .on('blur', '#message-footer textarea', () => {
        // Setting timeout to give change for clicking "add recipient" before hiding section.
        setTimeout(() => this.textAreaFocused = false, 500);
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    $('body').off('focus', '#message-footer textarea');
    $('body').off('blur', '#message-footer textarea');
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
    const content = $('.message-content-wrapper');
    const markers = content.find('.marker');
    let scrollTo = markers.length ? markers[0].offsetTop - 50 : content[0].scrollHeight;

    content.scrollTop(scrollTo);
    $('.message-content-wrapper').on('scroll', () => this.checkScroll(content));
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
    if (!this.selectedConversation) {
      return;
    }

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

  selectContact(id, type) {
    // See URL param "id" note at top of file.
    if (!id) {
      this.messagesActions.setMessagesError(false);
      this.globalActions.setLoadingContent(false);
      this.globalActions.unsetSelected();
      return;
    }

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
        setTimeout(() => this.scrollToUnread());
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
      this.loadingMoreContent = true;
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

        const first = $('.item-content .body #message-content ul > li').filter(':first');
        this.markConversationReadIfNeeded();

        let scroll:any = false;
        if (options.skip) {
          const spinnerHeight = 102;
          scroll = $('.message-content-wrapper li')[conversation.length].offsetTop - spinnerHeight;
        } else if (first.length && newMessageFromUser) {
          scroll = $('.message-content-wrapper')[0].scrollHeight;
        }

        if (scroll) {
          $('.message-content-wrapper').scrollTop(scroll);
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

  sendMessage() {
    if (!this.send.message) {
      return;
    }

    if (!this.selectedConversation) {
      console.error('Error sending message', new Error('No facility selected'));
      return;
    }

    const recipient = { doc: null };

    if (this.selectedConversation.contact && this.selectedConversation.contact.doc) { // known contact
      recipient.doc = this.selectedConversation.contact.doc;
    } else { // unknown sender
      recipient.doc = { contact: { phone: this.selectedConversation.id } };
    }

    this.sendMessageService.send(recipient, this.send.message)
      .then(() => {
        this.send.message = '';
      })
      .catch(err => {
        console.error('Error sending message', err);
      });
  }

  deleteDoc(doc) {
    if (doc) {
      this.globalActions.deleteDocConfirm(doc);
    }
  }

  addRecipients() {
    this.modalService.show(SendMessageComponent, {
      initialState: {
        fields: {
          to: this.selectedConversation.id,
          message: this.send.message
        }
      }
    });
    this.send.message = '';
  }
}
