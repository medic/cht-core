import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { MessagesComponent } from '@mm-modules/messages/messages.component';
import { ChangesService } from '@mm-services/changes.service';
import { MessageContactService } from '@mm-services/message-contact.service';
import { RelativeDatePipe } from '@mm-pipes/date.pipe';
import { SettingsService } from '@mm-services/settings.service';
import { ModalService } from '@mm-services/modal.service';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { NavigationService } from '@mm-services/navigation.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { FastActionButtonService } from '@mm-services/fast-action-button.service';
import { SendMessageComponent } from '@mm-modals/send-message/send-message.component';
import { MessagesMoreMenuComponent } from '@mm-modules/messages/messages-more-menu.component';
import { SessionService } from '@mm-services/session.service';
import { FastActionButtonComponent } from '@mm-components/fast-action-button/fast-action-button.component';
import { PerformanceService } from '@mm-services/performance.service';
import { ExportService } from '@mm-services/export.service';
import { AuthService } from '@mm-services/auth.service';

describe('Messages Component', () => {
  let component: MessagesComponent;
  let fixture: ComponentFixture<MessagesComponent>;
  let messageContactService;
  let changesService;
  let modalService;
  let fastActionButtonService;
  let authService;
  let sessionService;
  let performanceService;
  let extractLineageService;
  let stopPerformanceTrackStub;

  beforeEach(waitForAsync(() => {
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };
    modalService = { show: sinon.stub() };
    messageContactService = {
      getList: sinon.stub().resolves([]),
      isRelevantChange: sinon.stub()
    };
    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };
    fastActionButtonService = {
      getMessageActions: sinon.stub(),
      getButtonTypeForContentList: sinon.stub(),
    };
    authService = {
      online: sinon.stub().returns(false),
      any: sinon.stub(),
      has: sinon.stub()
    };
    sessionService = { isAdmin: sinon.stub() };
    extractLineageService = {
      getUserLineageToRemove: sinon.stub(),
      removeUserFacility: ExtractLineageService.prototype.removeUserFacility,
    };
    const mockedSelectors = [
      { selector: 'getSelectedConversation', value: {} },
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
          MessagesMoreMenuComponent,
          FastActionButtonComponent
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ChangesService, useValue: changesService },
          { provide: MessageContactService, useValue: messageContactService },
          { provide: SettingsService, useValue: {} }, // Needed because of ngx-translate provider's constructor.
          { provide: ExportService, useValue: {} },
          { provide: SessionService, useValue: sessionService },
          { provide: ModalService, useValue: modalService },
          { provide: NavigationService, useValue: {} },
          { provide: AuthService, useValue: authService },
          { provide: FastActionButtonService, useValue: fastActionButtonService },
          { provide: PerformanceService, useValue: performanceService },
          { provide: ExtractLineageService, useValue: extractLineageService },
          { provide: MatBottomSheet, useValue: { open: sinon.stub() } },
          { provide: MatDialog, useValue: { open: sinon.stub() } },
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
    expect(spySubscriptionsAdd.callCount).to.equal(3);
    expect(performanceService.track.calledTwice).to.be.true;
    expect(stopPerformanceTrackStub.calledOnce).to.be.true;
    expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({ name: 'message_list:load', recordApdex: true });
  });

  it('listTrackBy() should return unique identifier', () => {
    const messageWithDoc = { key: '134', id: 'abc', doc: { _rev: '567', id: 'xyz' } };
    const messageNoDoc = { key: '134', id: 'abc' };

    const resultWithDoc = component.listTrackBy(0, messageWithDoc);
    const resultNoDoc = component.listTrackBy(0, messageNoDoc);

    expect(resultWithDoc).to.equal('134xyz567');
    expect(resultNoDoc).to.equal('134abc');
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  it('should update fast actions', async () => {
    sinon.resetHistory();
    messageContactService.getList.resolves([
      { key: 'a', message: { inAllMessages: true } },
      { key: 'c', message: { inAllMessages: true } },
    ]);

    await component.updateConversations();

    expect(fastActionButtonService.getMessageActions.calledOnce).to.be.true;

    const params = fastActionButtonService.getMessageActions.args[0][0];
    params.callbackOpenSendMessage();
    expect(modalService.show.calledOnce).to.be.true;
    expect(modalService.show.args[0][0]).to.equal(SendMessageComponent);
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

  describe('Messages breadcrumbs', () => {
    const conversations = [
      { key: 'a',
        message: { inAllMessages: true },
        lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village', 'CHW Bettys Area', null]
      },
      { key: 'b',
        message: { inAllMessages: true },
        lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village']
      },
      { key: 'c',
        message: { inAllMessages: true },
        lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village', 'Ramdom Place', null, null]
      },
      { key: 'd',
        message: { inAllMessages: true },
        lineage: []
      },
      { key: 'e',
        message: { inAllMessages: true },
      },
    ];

    it('it should retrieve the hierarchy level of the connected user', fakeAsync(async () => {
      extractLineageService.getUserLineageToRemove.resolves('CHW Bettys Area');

      component.ngOnInit();
      tick();

      expect(await component.userLineageLevel).to.equal('CHW Bettys Area');
    }));

    it('should not remove the lineage when user lineage level is undefined', fakeAsync(() => {
      sinon.resetHistory();

      messageContactService.getList.resolves(conversations);
      extractLineageService.getUserLineageToRemove.resolves(undefined);
      component.ngOnInit();
      tick();
      component.updateConversations({ merge: true });
      tick();

      expect(component.conversations).to.deep.equal(conversations);
    }));

    it('should remove lineage when user lineage level is defined', fakeAsync(() => {
      sinon.resetHistory();
      const updatedConversations = [
        { key: 'a',
          message: { inAllMessages: true },
          lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village']
        },
        { key: 'b',
          message: { inAllMessages: true },
          lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village']
        },
        { key: 'c',
          message: { inAllMessages: true },
          lineage: [ 'Amy Johnsons Household', 'St Elmos Concession', 'Chattanooga Village', 'Ramdom Place']
        },
        { key: 'd',
          message: { inAllMessages: true },
          lineage: []
        },
        { key: 'e',
          message: { inAllMessages: true },
        },
      ];

      extractLineageService.getUserLineageToRemove.resolves('CHW Bettys Area');
      messageContactService.getList.resolves(conversations);
      component.ngOnInit();
      tick();
      component.updateConversations({ merge: true });
      tick();

      expect(component.conversations).to.deep.equal(updatedConversations);
    }));
  });
});

