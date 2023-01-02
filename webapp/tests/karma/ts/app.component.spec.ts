import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { of, Subject } from 'rxjs';
import { MockStore, provideMockStore } from '@ngrx/store/testing';

import { AppComponent } from '../../../src/ts/app.component';
import { DBSyncService } from '@mm-services/db-sync.service';
import { LanguageService, SetLanguageService } from '@mm-services/language.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { ChangesService } from '@mm-services/changes.service';
import { UpdateServiceWorkerService } from '@mm-services/update-service-worker.service';
import { LocationService } from '@mm-services/location.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { FeedbackService } from '@mm-services/feedback.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { JsonFormsService } from '@mm-services/json-forms.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { CountMessageService } from '@mm-services/count-message.service';
import { PrivacyPoliciesService } from '@mm-services/privacy-policies.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';
import { StartupModalsService } from '@mm-services/startup-modals.service';
import { TourService } from '@mm-services/tour.service';
import { CheckDateService } from '@mm-services/check-date.service';
import { UnreadRecordsService } from '@mm-services/unread-records.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { RecurringProcessManagerService } from '@mm-services/recurring-process-manager.service';
import { WealthQuintilesWatcherService } from '@mm-services/wealth-quintiles-watcher.service';
import { GlobalActions } from '@mm-actions/global';
import { ActionbarComponent } from '@mm-components/actionbar/actionbar.component';
import { SnackbarComponent } from '@mm-components/snackbar/snackbar.component';
import { DatabaseConnectionMonitorService } from '@mm-services/database-connection-monitor.service';
import { DatabaseClosedComponent } from '@mm-modals/database-closed/database-closed.component';
import { TranslateLocaleService } from '@mm-services/translate-locale.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { CHTScriptApiService } from '@mm-services/cht-script-api.service';
import { AnalyticsActions } from '@mm-actions/analytics';
import { AnalyticsModulesService } from '@mm-services/analytics-modules.service';
import { Selectors } from '@mm-selectors/index';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let store;
  let clock;

  // Services
  let dbSyncService;
  let languageService;
  let sessionService;
  let authService;
  let resourceIconsService;
  let changesService;
  let locationService;
  let xmlFormsService;
  let jsonFormsService;
  let countMessageService;
  let privacyPoliciesService;
  let tourService;
  let checkDateService;
  let rulesEngineService;
  let recurringProcessManagerService;
  let formatDateService;
  let feedbackService;
  let wealthQuintilesWatcherService;
  let startupModalsService;
  let unreadRecordsService;
  let setLanguageService;
  let translateService;
  let modalService;
  let databaseConnectionMonitorService;
  let translateLocaleService;
  let telemetryService;
  let transitionsService;
  let chtScriptApiService;
  let analyticsModulesService;
  // End Services

  let globalActions;
  let analyticsActions;
  let originalPouchDB;
  const changesListener:any = {};
  let consoleErrorStub;

  const getComponent = () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    // set this in index.html
    window.startupTimes = {};

    authService = { has: sinon.stub().resolves(true) };
    locationService = { path: 'localhost' };
    checkDateService = { check: sinon.stub() };
    countMessageService = { init: sinon.stub() };
    feedbackService = { init: sinon.stub() };
    xmlFormsService = { subscribe: sinon.stub() };
    jsonFormsService = { get: sinon.stub().resolves([]) };
    languageService = { get: sinon.stub().resolves({}) };
    rulesEngineService = { isEnabled: sinon.stub().resolves(true) };
    tourService = { endCurrent: sinon.stub() };
    resourceIconsService = { getAppTitle: sinon.stub().resolves() };
    privacyPoliciesService = { hasAccepted: sinon.stub().resolves() };
    formatDateService = { init: sinon.stub() };
    wealthQuintilesWatcherService = { start: sinon.stub() };
    startupModalsService = { showStartupModals: sinon.stub() };
    unreadRecordsService = { init: sinon.stub() };
    setLanguageService = { set: sinon.stub() };
    translateService = { instant: sinon.stub().returnsArg(0) };
    modalService = { show: sinon.stub().resolves() };
    chtScriptApiService = { isInitialized: sinon.stub() };
    analyticsModulesService = { get: sinon.stub() };
    databaseConnectionMonitorService = {
      listenForDatabaseClosed: sinon.stub().returns(of())
    };
    recurringProcessManagerService = {
      startUpdateRelativeDate: sinon.stub(),
      startUpdateReadDocsCount: sinon.stub(),
      stopUpdateReadDocsCount: sinon.stub()
    };
    changesService = {
      subscribe: options => changesListener[options.key] = options
    };
    sessionService = {
      init: sinon.stub().resolves(),
      isAdmin: sinon.stub().returns(true),
      isDbAdmin: sinon.stub().returns(false),
      userCtx: sinon.stub(),
      isOnlineOnly: sinon.stub()
    };
    dbSyncService = {
      addUpdateListener: sinon.stub(),
      isEnabled: sinon.stub().returns(false),
      sync: sinon.stub(),
      isSyncInProgress: sinon.stub(),
      subscribe: sinon.stub()
    };
    translateLocaleService = { reloadLang: sinon.stub() };
    transitionsService = { init: sinon.stub() };

    globalActions = {
      updateReplicationStatus: sinon.stub(GlobalActions.prototype, 'updateReplicationStatus'),
      setPrivacyPolicyAccepted: sinon.stub(GlobalActions.prototype, 'setPrivacyPolicyAccepted'),
      setShowPrivacyPolicy: sinon.stub(GlobalActions.prototype, 'setShowPrivacyPolicy'),
      setForms: sinon.stub(GlobalActions.prototype, 'setForms'),
    };
    analyticsActions = {
      setAnalyticsModules: sinon.stub(AnalyticsActions.prototype, 'setAnalyticsModules')
    };
    originalPouchDB = window.PouchDB;
    window.PouchDB = {
      fetch: sinon.stub()
    };
    telemetryService = { record: sinon.stub() };
    consoleErrorStub = sinon.stub(console, 'error');

    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: {} },
    ];

    await TestBed
      .configureTestingModule({
        declarations: [
          AppComponent,
          ActionbarComponent,
          SnackbarComponent,
        ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: DBSyncService, useValue: dbSyncService },
          { provide: TranslateService, useValue: translateService },
          { provide: LanguageService, useValue: languageService },
          { provide: SetLanguageService, useValue: setLanguageService },
          { provide: SessionService, useValue: sessionService },
          { provide: AuthService, useValue: authService },
          { provide: ResourceIconsService, useValue: resourceIconsService },
          { provide: ChangesService, useValue: changesService },
          { provide: UpdateServiceWorkerService, useValue: {} },
          { provide: LocationService, useValue: locationService },
          { provide: ModalService, useValue: modalService },
          { provide: FeedbackService, useValue: feedbackService },
          { provide: FormatDateService, useValue: formatDateService },
          { provide: XmlFormsService, useValue: xmlFormsService },
          { provide: JsonFormsService, useValue: jsonFormsService },
          { provide: TranslateFromService, useValue: {} },
          { provide: CountMessageService, useValue: countMessageService },
          { provide: PrivacyPoliciesService, useValue: privacyPoliciesService },
          { provide: RouteSnapshotService, useValue: {} },
          { provide: StartupModalsService, useValue: startupModalsService },
          { provide: TourService, useValue: tourService },
          { provide: CheckDateService, useValue: checkDateService },
          { provide: UnreadRecordsService, useValue: unreadRecordsService },
          { provide: RulesEngineService, useValue: rulesEngineService },
          { provide: RecurringProcessManagerService, useValue: recurringProcessManagerService },
          { provide: WealthQuintilesWatcherService, useValue: wealthQuintilesWatcherService },
          { provide: DatabaseConnectionMonitorService, useValue: databaseConnectionMonitorService },
          { provide: TranslateLocaleService, useValue: translateLocaleService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: TransitionsService, useValue: transitionsService },
          { provide: CHTScriptApiService, useValue: chtScriptApiService },
          { provide: AnalyticsModulesService, useValue: analyticsModulesService },
        ]
      })
      .compileComponents();
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    sinon.restore();
    clock && clock.restore();
    window.PouchDB = originalPouchDB;
    window.localStorage.removeItem('medic-last-replicated-date');
  });

  it('should create component and init services', async () => {
    await getComponent();
    await component.setupPromise;

    expect(component).to.exist;
    // load translations
    expect(languageService.get.callCount).to.equal(1);
    expect(setLanguageService.set.callCount).to.equal(1);
    // start wealth quintiles
    expect(wealthQuintilesWatcherService.start.callCount).to.equal(1);
    // init count message service
    expect(countMessageService.init.callCount).to.equal(1);
    // init feedback service
    expect(feedbackService.init.callCount).to.equal(1);
    // check privacy policy
    expect(privacyPoliciesService.hasAccepted.callCount).to.equal(1);
    // init rules engine
    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    // init CHTScriptApiService
    expect(chtScriptApiService.isInitialized.callCount).to.equal(1);
    // init unread count
    expect(unreadRecordsService.init.callCount).to.equal(1);
    expect(unreadRecordsService.init.args[0][0]).to.be.a('Function');
    // check date service
    expect(checkDateService.check.callCount).to.equal(1);
    // start recurring processes
    expect(recurringProcessManagerService.startUpdateRelativeDate.callCount).to.equal(1);
    expect(recurringProcessManagerService.startUpdateReadDocsCount.callCount).to.equal(0);
    expect(component.isSidebarFilterOpen).to.be.false;
  });

  it('should set isSidebarFilterOpen true when filter state is open', fakeAsync(async () => {
    authService.has.resolves(false);
    await getComponent();
    component.ngAfterViewInit();

    store.overrideSelector(Selectors.getSidebarFilter, { isOpen: true });
    store.refreshState();
    tick();

    expect(component.isSidebarFilterOpen).to.be.true;
  }));

  it('should subscribe to xmlFormService when initing forms', async () => {
    const form1 = {
      code: '123',
      name: 'something',
      translation_key: 'form1',
      title: 'title',
      icon: 'icon',
      subject_key: '4566'
    };
    const form2 = {
      _id: 'form:456',
      internalId: '456',
      name: 'something',
      translation_key: 'form2',
      title: 'title',
      icon: 'icon',
      subject_key: '7899'
    };
    jsonFormsService.get.resolves([form1]);

    await getComponent();
    await component.setupPromise;
    await component.translationsLoaded;

    expect(jsonFormsService.get.callCount).to.equal(1);
    expect(xmlFormsService.subscribe.callCount).to.equal(2);

    expect(xmlFormsService.subscribe.getCall(0).args[0]).to.equal('FormsFilter');
    expect(xmlFormsService.subscribe.getCall(0).args[1]).to.deep.equal( { contactForms: false, ignoreContext: true });
    expect(xmlFormsService.subscribe.getCall(0).args[2]).to.be.a('Function');
    xmlFormsService.subscribe.getCall(0).args[2](false, [form2]);
    expect(globalActions.setForms.callCount).to.equal(1);
    expect(globalActions.setForms.args[0][0]).to.have.deep.members([
      {
        id: '123',
        code: '123',
        icon: 'icon',
        subjectKey: '4566',
        title: 'form1'
      },
      {
        id: 'form:456',
        code: '456',
        icon: 'icon',
        subjectKey: '7899',
        title: 'form2'
      }
    ]);

    expect(xmlFormsService.subscribe.getCall(1).args[0]).to.equal('AddReportMenu');
    expect(xmlFormsService.subscribe.getCall(1).args[1]).to.deep.equal( { contactForms: false });
    expect(xmlFormsService.subscribe.getCall(1).args[2]).to.be.a('Function');
    xmlFormsService.subscribe.getCall(1).args[2](false, [form2]);
    expect(component.nonContactForms).to.have.deep.members([{
      id: 'form:456',
      code: '456',
      icon: 'icon',
      title: 'form2'
    }]);
  });

  it('should set privacy policy and start modals if privacy accepted', async () => {
    privacyPoliciesService.hasAccepted.resolves({ privacyPolicy: 'The policy...', accepted: false });
    await getComponent();
    await component.setupPromise;

    expect(privacyPoliciesService.hasAccepted.callCount).to.equal(1);
    expect(globalActions.setPrivacyPolicyAccepted.callCount).to.equal(1);
    expect(globalActions.setPrivacyPolicyAccepted.args[0]).to.have.members([false]);
    expect(globalActions.setShowPrivacyPolicy.callCount).to.equal(1);
    expect(globalActions.setShowPrivacyPolicy.args[0]).to.have.members(['The policy...']);
    expect(startupModalsService.showStartupModals.callCount).to.equal(0);

    privacyPoliciesService.hasAccepted.resolves({ privacyPolicy: undefined, accepted: false });
    await getComponent();
    await component.setupPromise;

    expect(globalActions.setPrivacyPolicyAccepted.callCount).to.equal(2);
    expect(globalActions.setPrivacyPolicyAccepted.getCall(1).args).to.have.members([false]);
    expect(globalActions.setShowPrivacyPolicy.callCount).to.equal(2);
    expect(globalActions.setShowPrivacyPolicy.getCall(1).args).to.have.members([undefined]);
    expect(startupModalsService.showStartupModals.callCount).to.equal(1);
  });

  it('should start the UpdateReadDocsCount recurring process for online users', async () => {
    sessionService.isOnlineOnly.returns(true);

    await getComponent();
    await component.setupPromise;

    expect(recurringProcessManagerService.startUpdateReadDocsCount.callCount).to.equal(1);
    expect(transitionsService.init.callCount).to.equal(0);
  });

  it('should start the TransitionsService for offline users', async () => {
    sessionService.isOnlineOnly.returns(false);

    await getComponent();
    await component.setupPromise;

    expect(recurringProcessManagerService.startUpdateReadDocsCount.callCount).to.equal(0);
    expect(transitionsService.init.callCount).to.equal(1);
  });

  it('should set app title', async () => {
    resourceIconsService.getAppTitle.resolves('My App');

    await getComponent();
    await Promise.resolve();

    expect(resourceIconsService.getAppTitle.callCount).to.equal(1);
    expect(document.title).to.equal('My App');
  });

  it('should watch the database connection and show database closed modal', fakeAsync(async () => {
    const observable = new Subject();
    databaseConnectionMonitorService.listenForDatabaseClosed.returns(observable);

    await getComponent();
    observable.next(true);
    tick();

    expect(databaseConnectionMonitorService.listenForDatabaseClosed.callCount).to.equal(1);
    expect(modalService.show.callCount).to.equal(1);
    expect(modalService.show.args[0]).to.have.deep.members([DatabaseClosedComponent]);
  }));

  describe('Setup DB', () => {
    it('should disable dbsync in replication status', async () => {
      dbSyncService.isEnabled.returns(false);
      window.localStorage.setItem('medic-last-replicated-date', '12345');

      await getComponent();

      expect(globalActions.updateReplicationStatus.callCount).to.equal(2);
      expect(globalActions.updateReplicationStatus.getCall(0).args).to.deep.equal([{
        disabled: false,
        lastTrigger: undefined,
        lastSuccessTo: 12345
      }]);
      expect(globalActions.updateReplicationStatus.getCall(1).args).to.deep.equal([{disabled: true}]);
      expect(dbSyncService.subscribe.callCount).to.equal(1);
    });

    it('should sync db if enabled', async () => {
      clock = sinon.useFakeTimers();
      dbSyncService.isEnabled.returns(true);

      await getComponent();

      expect(globalActions.updateReplicationStatus.callCount).to.equal(1);
      expect(globalActions.updateReplicationStatus.args[0]).to.deep.equal([{
        disabled: false,
        lastTrigger: undefined,
        lastSuccessTo: NaN
      }]);

      clock.tick(10 * 1000);
      await Promise.resolve();

      expect(dbSyncService.sync.callCount).to.equal(1);
      expect(dbSyncService.subscribe.callCount).to.equal(1);
    });

    it('should set dbSync replication status in subcription callback', async () => {
      clock = sinon.useFakeTimers();
      await getComponent();
      component.replicationStatus = {};
      const callback = dbSyncService.subscribe.args[0][0];

      callback({ state: 'disabled' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(3);
      expect(globalActions.updateReplicationStatus.getCall(2).args).to.deep.equal([{ disabled: true }]);

      callback({ state: 'unknown' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(4);
      expect(globalActions.updateReplicationStatus.getCall(3).args).to.deep.equal([{
        current: {
          icon: 'fa-info-circle',
          key: 'sync.status.unknown'
        }
      }]);

      callback({ state: 'inProgress' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(5);
      expect(globalActions.updateReplicationStatus.getCall(4).args).to.deep.equal([{
        lastTrigger: 0,
        current: {
          icon: 'fa-refresh',
          key: 'sync.status.in_progress',
          disableSyncButton: true
        }
      }]);

      callback({ state: '', to: 'success', from: 'success' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(6);
      expect(globalActions.updateReplicationStatus.getCall(5).args).to.deep.equal([{
        current: {
          icon: 'fa-check',
          key: 'sync.status.not_required',
          className: 'success'
        },
        lastSuccessFrom: 0,
        lastSuccessTo: 0
      }]);

      callback({ state: '', to: 'success', from: 'fail' });
      expect(globalActions.updateReplicationStatus.callCount).to.equal(7);
      expect(globalActions.updateReplicationStatus.getCall(6).args).to.deep.equal([{
        current: {
          icon: 'fa-exclamation-triangle',
          key: 'sync.status.required',
          className: 'required'
        },
        lastSuccessTo: 0
      }]);
    });
  });

  describe('Watch changes', () => {
    it('should watch changes in branding, dbSync, translations, ddoc and user context', async () => {
      await getComponent();

      expect(changesListener['branding-icon']).to.be.an('object');
      expect(changesListener['sync-status']).to.be.an('object');
      expect(changesListener.translations).to.be.an('object');
      expect(changesListener.ddoc).to.be.an('object');
      expect(changesListener['user-context']).to.be.an('object');
    });

    it('user-context change listener should filter only logged in user, if exists', async () => {
      sessionService.userCtx.returns({ name: 'adm', roles: ['alpha', 'omega'] });

      await getComponent();

      expect(changesListener['user-context'].filter({ id: 'something' })).to.equal(false);
      expect(changesListener['user-context'].filter({ id: 'someperson' })).to.equal(false);
      expect(changesListener['user-context'].filter({ id: 'org.couchdb.user:someone' })).to.equal(false);
      expect(changesListener['user-context'].filter({ id: 'org.couchdb.user:adm' })).to.equal(true);

      sessionService.userCtx.returns(false);

      await getComponent();

      expect(changesListener['user-context'].filter({ doc: { type: 'user-settings', name: 'a' }}))
        .to.equal(false);
    });

    it('user-context change listener callback should check current session', async () => {
      await getComponent();

      expect(sessionService.init.callCount).to.equal(1);
      changesListener['user-context'].callback();
      expect(sessionService.init.callCount).to.equal(2);
    });

    it('sync-status change listener callback should do nothing if sync in progress', async () => {
      dbSyncService.isSyncInProgress.returns(true);

      await getComponent();

      expect(changesListener['sync-status']).to.be.an('object');
      changesListener['sync-status'].callback();
      expect(dbSyncService.sync.callCount).to.equal(0);
    });

    it('sync-status change listener callback should call sync if not currently syncing', async () => {
      dbSyncService.isSyncInProgress.returns(false);

      await getComponent();

      expect(changesListener['sync-status']).to.be.an('object');
      changesListener['sync-status'].callback();
      expect(dbSyncService.sync.callCount).to.equal(1);
    });
  });

  describe('language reloading', () => {
    it('filter should only match translations docs', async () => {
      await getComponent();
      const filter = changesListener.translations.filter;
      expect(filter).to.be.a('function');

      expect(filter({ id: 'messages-en' })).to.equal(true);
      expect(filter({ id: 'messages-tl' })).to.equal(true);
      expect(filter({ id: 'not-messages-tl' })).to.equal(false);
      expect(filter({ })).to.equal(undefined);
      expect(filter({ id: 'undefined' })).to.equal(false);
    });

    it('callback should refresh the given locale when not enabled', async () => {
      languageService.get.resolves('enabled_locale');
      await getComponent();
      sinon.resetHistory();
      const callback = changesListener.translations.callback;
      expect(callback).to.be.a('function');

      await callback({ id: 'messages-locale' });

      expect(languageService.get.callCount).to.equal(1);
      expect(translateLocaleService.reloadLang.callCount).to.equal(1);
      expect(translateLocaleService.reloadLang.args[0]).to.deep.equal(['locale', false]);
    });

    it('callback should refresh the given locale when enabled', async () => {
      languageService.get.resolves('enabled_locale');
      await getComponent();
      sinon.resetHistory();
      const callback = changesListener.translations.callback;
      expect(callback).to.be.a('function');

      await callback({ id: 'messages-enabled_locale' });

      expect(languageService.get.callCount).to.equal(1);
      expect(translateLocaleService.reloadLang.callCount).to.equal(1);
      expect(translateLocaleService.reloadLang.args[0]).to.deep.equal(['enabled_locale', true]);
    });
  });

  describe('Initialized Analytics Modules', () => {
    it('should set analytics modules', fakeAsync(async () => {
      analyticsModulesService.get.resolves([{
        id: 'targets',
        label: 'analytics.targets',
        route: [ '/', 'analytics', 'targets' ]
      }]);

      await getComponent();
      tick();

      expect(consoleErrorStub.callCount).to.equal(0);
      expect(analyticsModulesService.get.callCount).to.equal(1);
      expect(analyticsActions.setAnalyticsModules.callCount).to.equal(1);
      expect(analyticsActions.setAnalyticsModules.args[0]).to.deep.equal([
        [{
          id: 'targets',
          label: 'analytics.targets',
          route: [ '/', 'analytics', 'targets' ]
        }]
      ]);
    }));

    it('should catch exception', fakeAsync(async () => {
      analyticsModulesService.get.throws({ error: 'Oops' });

      await getComponent();
      tick();

      expect(consoleErrorStub.callCount).to.equal(1);
      expect(consoleErrorStub.args[0]).to.deep.equal([
        'Error while initializing analytics modules',
        { error: 'Oops' }
      ]);
      expect(analyticsModulesService.get.callCount).to.equal(1);
      expect(analyticsActions.setAnalyticsModules.callCount).to.equal(0);
    }));
  });
});
