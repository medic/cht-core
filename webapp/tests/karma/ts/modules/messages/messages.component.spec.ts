import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';

import { MessagesComponent } from '@mm-modules/messages/messages.component';
import { ChangesService } from '@mm-services/changes.service';
import { MessageContactService } from '@mm-services/message-contact.service';
import { RelativeDatePipe } from '@mm-pipes/date.pipe';
import { SettingsService } from '@mm-services/settings.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { TourService } from '@mm-services/tour.service';
import { NavigationService } from '@mm-services/navigation.service';

describe('Messages Component', () => {
  let component: MessagesComponent;
  let fixture: ComponentFixture<MessagesComponent>;
  let messageContactService;
  let changesService;
  let exportService;
  let modalService;

  beforeEach(async(() => {
    modalService = { show: sinon.stub() };
    messageContactService = {
      getList: sinon.stub().resolves([]),
      isRelevantChange: sinon.stub()
    };
    changesService = {
      subscribe: sinon.stub().resolves(of({}))
    };
    const tourServiceMock = {
      startIfNeeded: () => {}
    };
    const mockedSelectors = [
      { selector: 'getSelectedConversation', value: {} },
      { selector: 'getConversations', value: []},
      { selector: 'getLoadingContent', value: false },
      { selector: 'getMessagesError', value: false },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule
        ],
        declarations: [
          MessagesComponent,
          RelativeDatePipe,
          NavigationComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ChangesService, useValue: changesService },
          { provide: MessageContactService, useValue: messageContactService },
          { provide: SettingsService, useValue: {} }, // Needed because of ngx-translate provider's constructor.
          { provide: exportService, useValue: {} },
          { provide: ModalService, useValue: modalService },
          { provide: TourService, useValue: tourServiceMock },
          { provide: NavigationService, useValue: {} },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(MessagesComponent);
        component = fixture.componentInstance;
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
    changesService.subscribe.reset();
    const spySubscriptionsAdd = sinon.spy(component.subscriptions, 'add');

    component.ngOnInit();

    expect(spyUpdateConversations.callCount).to.equal(1);
    expect(changesService.subscribe.callCount).to.equal(1);
    expect(spySubscriptionsAdd.callCount).to.equal(2);
  });

  it('listTrackBy() should return unique identifier', () => {
    const messageWithDoc = { key: '134', id: 'abc', doc: { _rev: '567', id: 'xyz' } };
    const messageNoDoc = { key: '134', id: 'abc' };

    const resultWithDoc = component.listTrackBy(0, messageWithDoc);
    const resultNoDoc = component.listTrackBy(0, messageNoDoc);

    expect(resultWithDoc).to.equal('134xyz567');
    expect(resultNoDoc).to.equal('134abc');
  });

  describe('updateConversations()', () => {
    it('should get conversations and add new one', async () => {
      const newConversations = [
        { key: 'a', message: { inAllMessages: true } },
        { key: 'c', message: { inAllMessages: true } },
        { key: 'b', message: { fromUpdatedMessages: true } }
      ];
      messageContactService.getList.reset();
      messageContactService.getList.resolves(newConversations);
      component.conversations = [
        { key: 'a', message: { inAllMessages: true } },
        { key: 'c', message: { inAllMessages: true } }
      ];
      fixture.detectChanges();

      await component.updateConversations({ merge: true });

      expect(messageContactService.getList.callCount).to.equal(1);
      expect(component.loading).to.be.false;
      expect(component.conversations.length).to.equal(3);
      expect(component.conversations).to.eql(newConversations);
    });

    it('should get conversations and replace updated ones', async () => {
      const newConversations = [
        { key: 'a', message: { inAllMessages: true } },
        { key: 'b', message: { fromUpdatedMessages: true } }
      ];
      messageContactService.getList.reset();
      messageContactService.getList.resolves(newConversations);
      const expectedConversations =  [
        { key: 'a', message: { inAllMessages: true } },
        { key: 'b', message: { fromUpdatedMessages: true }, read: false }
      ];
      component.conversations = [
        { key: 'a', message: { inAllMessages: true } },
        { key: 'b', message: { inAllMessages: true }, read: true }
      ];
      fixture.detectChanges();

      await component.updateConversations({ merge: true });

      expect(messageContactService.getList.callCount).to.equal(1);
      expect(component.loading).to.be.false;
      expect(component.conversations).to.eql( expectedConversations);
    });

    it('should get conversations and remove conversations that no longer exist', async () => {
      const newConversations = [
        { key: 'a', message: { updatedMessage: true }, read: false },
        { key: 'b', message: { updatedMessage: true }, read: false }
      ];
      messageContactService.getList.reset();
      messageContactService.getList.resolves(newConversations);
      component.conversations = [
        { key: 'a', message: { inAllMessages: true } },
        { key: 'b', message: { inAllMessages: true } },
        { key: 'c', message: { inAllMessages: true } },
        { key: 'd', message: { inAllMessages: true } },
      ];
      fixture.detectChanges();

      await component.updateConversations({ merge: true });

      expect(messageContactService.getList.callCount).to.equal(1);
      expect(component.loading).to.be.false;
      expect(component.conversations).to.eql( newConversations);
    });
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });
});
