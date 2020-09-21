import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';

import { MessagesComponent } from '@mm-modules/messages/messages.component';
import { ChangesService } from '@mm-services/changes.service';
import { MessageContactService } from '@mm-services/message-contact.service';

describe('Messages Component', () => {
  let component: MessagesComponent;
  let fixture: ComponentFixture<MessagesComponent>;
  let store: MockStore;
  let messageContactService;
  let changesService;

  beforeEach(async(() => {
    const messageContactServiceMock = {
      getList: sinon.stub().returns(Promise.resolve([]))
    };
    const changesServiceMock = {
      subscribe: sinon.stub().returns(Promise.resolve(of({})))
    };
    const mockedSelectors = [
      { selector: 'getSelectedConversation', value: {} },
      { selector: 'getConversations', value: []},
      { selector: 'getLoadingContent', value: false },
      { selector: 'getMessagesError', value: false },
    ];

    TestBed.configureTestingModule({
      declarations: [
        MessagesComponent
      ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: ChangesService, useValue: changesServiceMock },
        { provide: MessageContactService, useValue: messageContactServiceMock },
      ]
    }).compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(MessagesComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        messageContactService = TestBed.inject(MessageContactService);
        changesService = TestBed.inject(ChangesService);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create MessagesComponent', () => {
    expect(component).to.exist;
  });

  it('ngOnInit() should update conversations and watch for changes', () => {
    const spyUpdateConversations = sinon.spy(component, 'updateConversations');
    const spyWatchForChanges = sinon.spy(component, 'watchForChanges');

    component.ngOnInit();

    expect(spyUpdateConversations.callCount).to.equal(1);
    expect(spyWatchForChanges.callCount).to.equal(1);
  });

  it('listTrackBy() should return unique identifier', () => {
    const message = { key: '134', doc: { _rev: '567' } };

    const result = component.listTrackBy(0, message);

    expect(result).to.equal('134567');
  });

  describe('mergeUpdated()', () => {
    it('should add new conversations to currentConversations', () => {
      const conversations = [
        { key: 'a', message: { inAllMessages: true } },
        { key: 'c', message: { inAllMessages: true } }
      ];
      const changedMessages = [
        { key: 'b', message: { fromUpdatedMessages: true } }
      ];

      component.mergeUpdated(conversations, changedMessages);

      chai.expect(conversations).to.deep.equal([
        { key: 'a', message: { inAllMessages: true }},
        { key: 'c', message: { inAllMessages: true }},
        { key: 'b', message: { fromUpdatedMessages: true }}
      ]);
    });

    it('should replace updated conversations in currentConversations', () => {
      const conversations = [
        { key: 'a', message: { inAllMessages: true } },
        { key: 'b', message: { inAllMessages: true }, read: true },
        { key: 'c', message: { inAllMessages: true } }
      ];
      const changedMessages = [
        { key: 'b', message: { fromUpdatedMessages: true } }
      ];

      component.mergeUpdated(conversations, changedMessages);

      chai.expect(conversations).to.deep.equal([
        { key: 'a', message: { inAllMessages: true } },
        { key: 'b', message: { fromUpdatedMessages: true }, read: false },
        { key: 'c', message: { inAllMessages: true } }
      ]);
    });
  });

  it('removeDeleted() should remove conversations that no longer exist from the passed list', () => {
    const conversations = [
      { key: 'a', message: { inAllMessages: true } },
      { key: 'b', message: { inAllMessages: true } },
      { key: 'c', message: { inAllMessages: true } },
      { key: 'd', message: { inAllMessages: true } },
      { key: 'e', message: { inAllMessages: true } },
    ];
    const updatedConversations = [
      { key: 'a', message: { updatedMessage: true } },
      { key: 'c', message: { updatedMessage: true } },
    ];

    component.removeDeleted(conversations, updatedConversations);

    chai.expect(conversations).to.deep.equal([
      { key: 'a', message: { inAllMessages: true } },
      { key: 'c', message: { inAllMessages: true } },
    ]);
  });

  it('updateConversations() should get conversations and set them', () => {
    const conversations = [
      { key: 'a', message: { inAllMessages: true } },
      { key: 'c', message: { inAllMessages: true } }
    ];
    messageContactService.getList.reset();
    messageContactService.getList.returns(Promise.resolve(conversations));
    const spySetConversations = sinon.spy(component, 'setConversations');

    component
      .updateConversations({ merge: true })
      .then(() => {
        expect(spySetConversations.withArgs(conversations, { merge: true }).callCount).to.equal(1);
        expect(component.loading).to.be.false;
      });

    expect(messageContactService.getList.callCount).to.equal(1);
  });

  it('watchForChanges() should subscribe for watching changes', () => {
    changesService.subscribe.reset();
    const spySubscriptionsAdd = sinon.spy(component.subscriptions, 'add');

    component.watchForChanges();

    expect(changesService.subscribe.callCount).to.equal(1);
    expect(spySubscriptionsAdd.callCount).to.equal(1);
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });
});
