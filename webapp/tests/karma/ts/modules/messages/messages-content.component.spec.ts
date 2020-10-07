import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import sinon from 'sinon';
import { expect, assert } from "chai";

import { MessagesContentComponent } from '@mm-modules/messages/messages-content.component';
import { MessageContactService } from '@mm-services/message-contact.service';
import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { MarkReadService } from '@mm-services/mark-read.service';
import { SendMessageService } from '@mm-services/send-message.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';

describe('MessagesContentComponent', () => {
  let component: MessagesContentComponent;
  let fixture: ComponentFixture<MessagesContentComponent>;
  let store: MockStore;
  let messageContactService;
  let changesService;
  let sessionService;
  let lineageModelGeneratorService;
  let markReadService;
  let sendMessageService;
  let modalService;
  let changesFilter;
  let changesCallback;

  beforeEach(async(() => {
    const messageContactServiceMock = {
      getConversation: sinon.stub().resolves([]),
      isRelevantChange: sinon.stub()
    };
    const changesServiceMock = {
      subscribe: sinon.stub().callsFake((opts) => {
        changesCallback = opts.callback;
        changesFilter = opts.filter;
        return { unsubscribe: sinon.stub() };
      })
    };
    sessionService = { userCtx: sinon.stub() };
    lineageModelGeneratorService = { contact: sinon.stub().resolves() };
    markReadService = { markAsRead: sinon.stub().resolves() };
    sendMessageService = { send: sinon.stub().resolves() };
    modalService = { show: sinon.stub() };
    const mockedSelectors = [
      { selector: 'getSelectedConversation', value: {} },
      { selector: 'getLoadingContent', value: false },
    ];

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule
      ],
      declarations: [
        MessagesContentComponent
      ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ChangesService, useValue: changesServiceMock },
        { provide: MessageContactService, useValue: messageContactServiceMock },
        { provide: SettingsService, useValue: {} }, // Needed because of ngx-translate provider's constructor.
        { provide: SessionService, useValue: sessionService },
        { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
        { provide: MarkReadService, useValue: markReadService },
        { provide: SendMessageService, useValue: sendMessageService },
        { provide: ModalService, useValue: modalService },
      ]
    })
    .compileComponents()
    .then(() => {
      fixture = TestBed.createComponent(MessagesContentComponent);
      component = fixture.componentInstance;
      store = TestBed.inject(MockStore);
      messageContactService = TestBed.inject(MessageContactService);
      changesService = TestBed.inject(ChangesService);
      sessionService = TestBed.inject(SessionService);
      markReadService = TestBed.inject(MarkReadService);
      sendMessageService = TestBed.inject(SendMessageService);
      modalService = TestBed.inject(ModalService);
      fixture.detectChanges();
    });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create', () => {
    expect(component).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  describe('Messages without contact', () => {
    const id = '12';
    const type = 'contact';
    const phone = '+12';
    const res = {
      doc: {
        tasks: [
          { messages: [ { to: phone, contact: { _id: id }} ] },
          { messages: [ { to: phone, contact: { _id: id }} ] }
        ]
      }
    };

    it('should pull the contact phone number from the first message and show empty user name', async () => {
      component.urlParameters.id = id;
      component.urlParameters.type = type;
      lineageModelGeneratorService.contact.rejects({ code: 404 });
      messageContactService.getConversation.resolves([res]);
      const updateSelectedConversationSpy = sinon.spy(component.messagesActions, 'updateSelectedConversation')

      await component
        .selectContact(id, type)
        .then(() => {
          assert.equal(lineageModelGeneratorService.contact.callCount, 1);
          assert.equal(lineageModelGeneratorService.contact.getCall(0).args[0], id);
          assert.equal(messageContactService.getConversation.callCount, 1);
          assert.equal(messageContactService.getConversation.getCall(0).args[0], id);
          assert.equal(updateSelectedConversationSpy.callCount, 1);
          assert.equal(updateSelectedConversationSpy.getCall(0).args[0].contact.doc.name, '');
          assert.equal(updateSelectedConversationSpy.getCall(0).args[0].contact.doc.phone, phone);
        });
    });

    it('should not fail when no contact and no conversation', async () => {
      component.urlParameters.id = id;
      component.urlParameters.type = type;
      lineageModelGeneratorService.contact.rejects({ code: 404 });
      messageContactService.getConversation.resolves([]);
      const updateSelectedConversationSpy = sinon.spy(component.messagesActions, 'updateSelectedConversation')

      await component
        .selectContact(id, type)
        .then(() => {
          assert.equal(lineageModelGeneratorService.contact.callCount, 1);
          assert.equal(lineageModelGeneratorService.contact.getCall(0).args[0], id);
          assert.equal(messageContactService.getConversation.callCount, 1);
          assert.deepEqual(messageContactService.getConversation.getCall(0).args, [id]);
          assert.equal(updateSelectedConversationSpy.callCount, 1);
          assert.deepEqual(updateSelectedConversationSpy.args[0], [ { contact: undefined, messages: [] } ]);
        });
    });
  });

  describe('Watching changesService.subscribe', () => {
    it('should start watching changesService.subscribe', () => {
      component.ngOnInit();

      expect(changesService.subscribe.callCount).to.equal(2);
      expect(changesService.subscribe.args[0][0].key).to.equal('messages-content');
      expect(changesService.subscribe.args[0][0].callback).to.be.a('function');
      expect(changesService.subscribe.args[0][0].filter).to.be.a('function');
      expect(sessionService.userCtx.callCount).to.equal(2);
    });

    it('should filter relevant changesService.subscribe', () => {
      const change = { id: 'id' };
      const change2 = { id: 'id' };
      const selectedConversation = {
        contact: { name: 'peter' },
        messages: [
          { id: 'message1' },
          { id: 'message2' },
          { id: 'message3' }
        ]
      };
      component.selectedConversation = selectedConversation;

      component.ngOnInit();

      messageContactService.isRelevantChange.returns(false);
      expect(!!changesFilter(change)).to.equal(false);
      expect(messageContactService.isRelevantChange.callCount).to.deep.equal(1);
      expect(messageContactService.isRelevantChange.args[0]).to.deep.equal([change, selectedConversation]);
      messageContactService.isRelevantChange.returns(true);
      expect(!!changesFilter(change2)).to.equal(true);
      expect(messageContactService.isRelevantChange.callCount).to.deep.equal(2);
      expect(messageContactService.isRelevantChange.args[1]).to.deep.equal([change2, selectedConversation]);
    });

    describe('updating the conversation', () => {
      it('should not do anything when no conversation is selected', () => {
        component.selectedConversation = null;
        const change = { id: 'id', deleted: true };

        component.ngOnInit();

        expect(messageContactService.getConversation.callCount).to.equal(0);
        changesCallback(change)
        expect(messageContactService.getConversation.callCount).to.equal(0)
      });

      it('should update the conversation when conversation is selected', () => {
        const change = { id: 'message3' };
        const contact = { name: 'contact', _id: 'c1' };
        const messages = [ { doc: { _id: 'message1' } }, { doc: { _id: 'message2' } } ];
        lineageModelGeneratorService.contact.resolves(contact);
        component.selectedConversation = { contact, messages, id: contact._id }
        component.urlParameters.id = 'c1';
        component.urlParameters.type = 'contact';
        const updateSelectedConversationSpy = sinon.spy(component.messagesActions, 'updateSelectedConversation');
        messageContactService.conversation
          .onCall(0).resolves(messages)
          .onCall(1).resolves([...messages, { doc: { _id: 'message3' } }]);

        component.ngOnInit();

        expect(messageContactService.getConversation.callCount).to.equal(1);
        expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
        changesCallback(change);
        expect(messageContactService.getConversation.callCount).to.equal(2);
        expect(messageContactService.getConversation.args[1]).to.deep.equal(['c1', undefined, messages.length]);
        expect(updateSelectedConversationSpy.callCount).to.equal(1);
        expect(updateSelectedConversationSpy.args[0]).to.deep.equal([
          { messages: [...messages, { doc: { _id: 'message3' } }] }
        ]);
      });

      it('should remove deleted messages from selected conversation', () => {
        const change = { id: 'message2', deleted: true };
        const contact = { name: 'contact', _id: 'c1' };
        const messages = [{ doc: { _id: 'message1' } }, { doc: { _id: 'message2' } } ];
        messageContactService.getConversation.resolves(messages);
        lineageModelGeneratorService.contact.resolves(contact);
        component.selectedConversation = { contact, messages, id: contact._id };
        component.urlParameters.id = 'c1';
        component.urlParameters.type = 'contact';
        const updateSelectedConversationSpy = sinon.spy(component.messagesActions, 'updateSelectedConversation');
        const removeMessageFromSelectedConversationSpy = sinon.spy(component.messagesActions, 'updateSelectedConversation');


        component.ngOnInit();

        expect(messageContactService.getConversation.callCount).to.equal(1);
        expect(lineageModelGeneratorService.contact.callCount).to.equal(1);
        changesCallback(change);
        expect(messageContactService.getConversation.callCount).to.equal(1);
        expect(updateSelectedConversationSpy.callCount).to.equal(0);
        expect(removeMessageFromSelectedConversationSpy.callCount).to.equal(1);
        expect(removeMessageFromSelectedConversationSpy.args[0]).to.deep.equal(['message2']);
      });
    });
  });
});
