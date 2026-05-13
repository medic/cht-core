import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { HeaderComponent } from '@mm-components/header/header.component';
import { DBSyncService } from '@mm-services/db-sync.service';
import { ModalService } from '@mm-services/modal.service';
import { StorageInfoService } from '@mm-services/storage-info.service';
import { HeaderTabsService } from '@mm-services/header-tabs.service';
import { CustomResourceService } from '@mm-services/custom-resource.service';
import { ChangesService } from '@mm-services/changes.service';
import { FeedbackComponent } from '@mm-modals/feedback/feedback.component';
import { Selectors } from '@mm-selectors/index';

describe('Header Component', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let store: MockStore;
  let dbSyncService;
  let modalService;
  let storageInfoService;
  let headerTabsService;
  let customResourceService;
  let changesService;

  beforeEach(waitForAsync(() => {
    dbSyncService = { sync: sinon.stub() };
    modalService = { show: sinon.stub() };
    storageInfoService = {
      init: sinon.stub(),
      stop: sinon.stub()
    };
    headerTabsService = {
      get: sinon.stub().returns([]),
      getAuthorizedTabs: sinon.stub().resolves([
        { name: 'messages', defaultIcon: 'fa-envelope' },
        { name: 'tasks', defaultIcon: 'fa-flag', typeName: 'task' },
        { name: 'reports', defaultIcon: 'fa-list-alt', typeName: 'report' },
      ]),
      getSidebarTabs: sinon.stub().resolves([])
    };
    customResourceService = {
      getAppTitle: sinon.stub().resolves('App Title'),
      getImg: sinon.stub().resolves(''),
    };
    changesService = {
      subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }),
    };

    const mockedSelectors = [
      { selector: Selectors.getCurrentTab, value: 'messages' },
      { selector: Selectors.getShowPrivacyPolicy, value: false },
      { selector: Selectors.getBubbleCounter, value: {} },
      { selector: Selectors.getReplicationStatus, value: {} },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          BrowserAnimationsModule,
          HeaderComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: DBSyncService, useValue: dbSyncService },
          { provide: ModalService, useValue: modalService },
          { provide: StorageInfoService, useValue: storageInfoService },
          { provide: HeaderTabsService, useValue: headerTabsService },
          { provide: CustomResourceService, useValue: customResourceService },
          { provide: ChangesService, useValue: changesService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        // Don't call detectChanges here - let each test control when to trigger change detection
      });
  }));

  afterEach(() => {
    sinon.restore();
    store?.resetSelectors();
    fixture?.destroy();
  });

  it('should create header component', () => {
    fixture.detectChanges();
    expect(component).to.exist;
  });

  it('should initialize with empty bubble count', () => {
    fixture.detectChanges();
    expect(component.bubbleCount).to.deep.equal({});
  });

  it('should subscribe to bubble counter selector on init', () => {
    store.overrideSelector(Selectors.getBubbleCounter, { report: 5, message: 3 });
    store.refreshState();
    fixture.detectChanges();

    expect(component.bubbleCount).to.deep.equal({ report: 5, message: 3 });
  });

  it('should update bubble count when selector value changes', () => {
    fixture.detectChanges();
    expect(component.bubbleCount).to.deep.equal({});

    store.overrideSelector(Selectors.getBubbleCounter, { report: 10 });
    store.refreshState();
    fixture.detectChanges();

    expect(component.bubbleCount).to.deep.equal({ report: 10 });

    store.overrideSelector(Selectors.getBubbleCounter, { report: 8, message: 2, task: 3 });
    store.refreshState();
    fixture.detectChanges();

    expect(component.bubbleCount).to.deep.equal({ report: 8, message: 2, task: 3 });
  });

  it('should include task count in bubble counter', () => {
    store.overrideSelector(Selectors.getBubbleCounter, { report: 5, task: 10 });
    store.refreshState();
    fixture.detectChanges();

    expect(component.bubbleCount).to.deep.equal({ report: 5, task: 10 });
  });

  it('should subscribe to current tab selector', () => {
    store.overrideSelector(Selectors.getCurrentTab, 'tasks');
    store.refreshState();
    fixture.detectChanges();

    expect(component.currentTab).to.equal('tasks');
  });

  it('should subscribe to show privacy policy selector', () => {
    fixture.detectChanges();
    expect(component.showPrivacyPolicy).to.be.false;

    store.overrideSelector(Selectors.getShowPrivacyPolicy, true);
    store.refreshState();
    fixture.detectChanges();

    expect(component.showPrivacyPolicy).to.be.true;
  });

  it('should load header tabs from header tabs service', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    expect(headerTabsService.getAuthorizedTabs.callCount).to.equal(1);
    expect(headerTabsService.getAuthorizedTabs.args[0]).to.deep.equal([]);
  });

  it('should set permitted tabs after loading', async () => {
    const expectedTabs = [
      { name: 'messages', defaultIcon: 'fa-envelope' },
      { name: 'tasks', defaultIcon: 'fa-flag', typeName: 'task' },
      { name: 'reports', defaultIcon: 'fa-list-alt', typeName: 'report' },
    ];
    headerTabsService.getAuthorizedTabs.resolves(expectedTabs);

    fixture.detectChanges();
    await component.ngOnInit();
    await fixture.whenStable();

    expect(component.permittedTabs).to.deep.equal(expectedTabs);
  });

  it('should unsubscribe on destroy', () => {
    fixture.detectChanges();
    const unsubscribeSpy = sinon.spy(component['subscriptions'], 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeSpy.callCount).to.equal(1);
  });

  describe('legacy menu tabs', () => {
    it('should initialize legacyMenuTabs as empty array', async () => {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(headerTabsService.getSidebarTabs.callCount).to.equal(1);
      expect(component.legacyMenuTabs).to.deep.equal([]);
    });

    it('should populate legacyMenuTabs', async () => {
      const sidebarTabs = [
        {
          name: 'messages',
          route: 'messages',
          defaultIcon: 'fa-envelope',
          translation: 'Messages',
          permissions: ['can_view_messages', '!can_view_messages_tab'],
        },
        {
          name: 'ui-extension-first',
          route: 'ui-extensions/first',
          defaultIcon: 'fa-question-circle',
          translation: 'First Extension',
          permissions: [],
          icon: 'fa-icon-1',
          resourceIcon: 'res-1',
        },
        {
          name: 'bug',
          defaultIcon: 'fa-bug',
          translation: 'Report Bug',
          permissions: [],
        },
      ];
      headerTabsService.getSidebarTabs.resolves(sidebarTabs);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(headerTabsService.getSidebarTabs).to.have.been.calledOnceWithExactly();
      expect(component.legacyMenuTabs).to.deep.equal(sidebarTabs);
    });
  });

  describe('onLegacyMenuClick()', () => {
    it('should open the feedback modal when the bug tab is clicked', () => {
      fixture.detectChanges();

      component.onLegacyMenuClick({
        name: 'bug',
        defaultIcon: 'fa-bug',
        translation: 'Report Bug',
        permissions: [],
      });

      expect(modalService.show).to.have.been.calledOnce;
      expect(modalService.show.args[0][0]).to.equal(FeedbackComponent);
    });

    it('should not open the feedback modal for any other tab', () => {
      fixture.detectChanges();

      component.onLegacyMenuClick({
        name: 'messages',
        route: 'messages',
        defaultIcon: 'fa-envelope',
        translation: 'Messages',
        permissions: [],
      });

      expect(modalService.show).to.not.have.been.called;
    });
  });

  describe('bubble counter integration', () => {
    it('should handle zero counts', () => {
      store.overrideSelector(Selectors.getBubbleCounter, { report: 0, message: 0, task: 0 });
      store.refreshState();
      fixture.detectChanges();

      expect(component.bubbleCount).to.deep.equal({ report: 0, message: 0, task: 0 });
    });

    it('should handle partial counts', () => {
      store.overrideSelector(Selectors.getBubbleCounter, { task: 5 });
      store.refreshState();
      fixture.detectChanges();

      expect(component.bubbleCount).to.deep.equal({ task: 5 });
    });

    it('should handle large counts', () => {
      store.overrideSelector(Selectors.getBubbleCounter, { report: 150, message: 200, task: 99 });
      store.refreshState();
      fixture.detectChanges();

      expect(component.bubbleCount).to.deep.equal({ report: 150, message: 200, task: 99 });
    });

    it('should update bubble count multiple times', () => {
      store.overrideSelector(Selectors.getBubbleCounter, { task: 1 });
      store.refreshState();
      fixture.detectChanges();
      expect(component.bubbleCount).to.deep.equal({ task: 1 });

      store.overrideSelector(Selectors.getBubbleCounter, { task: 2 });
      store.refreshState();
      fixture.detectChanges();
      expect(component.bubbleCount).to.deep.equal({ task: 2 });

      store.overrideSelector(Selectors.getBubbleCounter, { task: 3, report: 5 });
      store.refreshState();
      fixture.detectChanges();
      expect(component.bubbleCount).to.deep.equal({ task: 3, report: 5 });
    });
  });
});
