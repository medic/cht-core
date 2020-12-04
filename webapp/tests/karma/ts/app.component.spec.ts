import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';

import { AppComponent } from '../../../src/ts/app.component';
import { DBSyncService } from '@mm-services/db-sync.service';
import { TranslationLoaderService } from '@mm-services/translation-loader.service';
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

describe.only('AppComponent', () => {
  let getComponent;
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

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
  // End Services

  let globalActions;
  let originalPouchDB;
  const changesListener = {};

  beforeEach(async(() => {
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
      isAdmin: sinon.stub(),
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

    globalActions = {
      updateReplicationStatus: sinon.stub(GlobalActions.prototype, 'updateReplicationStatus'),
      setPrivacyPolicyAccepted: sinon.stub(GlobalActions.prototype, 'setPrivacyPolicyAccepted'),
      setShowPrivacyPolicy: sinon.stub(GlobalActions.prototype, 'setShowPrivacyPolicy')
    };
    originalPouchDB = window.PouchDB;
    window.PouchDB = {
      fetch: sinon.stub()
    };

    TestBed.configureTestingModule({
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
        provideMockStore(),
        { provide: DBSyncService, useValue: dbSyncService },
        { provide: TranslateService, useValue: {} },
        { provide: TranslationLoaderService, useValue: {} },
        { provide: LanguageService, useValue: languageService },
        { provide: SetLanguageService, useValue: setLanguageService },
        { provide: SessionService, useValue: sessionService },
        { provide: AuthService, useValue: authService },
        { provide: ResourceIconsService, useValue: resourceIconsService },
        { provide: ChangesService, useValue: changesService },
        { provide: UpdateServiceWorkerService, useValue: {} },
        { provide: LocationService, useValue: locationService },
        { provide: ModalService, useValue: {} },
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
      ]
    });

    getComponent = () => {
      return TestBed
        .compileComponents()
        .then(() => {
          fixture = TestBed.createComponent(AppComponent);
          component = fixture.componentInstance;
          fixture.detectChanges();
        });
    };
  }));

  afterEach(() => {
    sinon.restore();
    window.PouchDB = originalPouchDB;
  });

  it('should create component and start services', async () => {
    await getComponent();
    await component.setupPromise;

    expect(component).to.exist;
    expect(privacyPoliciesService.hasAccepted.callCount).to.equal(1);
    expect(recurringProcessManagerService.startUpdateRelativeDate.callCount).to.equal(1);
    expect(recurringProcessManagerService.startUpdateReadDocsCount.callCount).to.equal(0);
    expect(rulesEngineService.isEnabled.callCount).to.equal(1);
    expect(checkDateService.check.callCount).to.equal(1);
    expect(unreadRecordsService.init.callCount).to.equal(1);
    expect(unreadRecordsService.init.args[0][0]).to.be.a('Function');
    expect(languageService.get.callCount).to.equal(1);
    expect(setLanguageService.set.callCount).to.equal(1);
  });

  it('should set translation and subscribe to xmlFormService', async () => {
// ToDo: in progress
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

  it('should start the UpdateReadDocsCount recurring process when user is online', async () => {
    sessionService.isOnlineOnly.returns(true);

    await getComponent();
    await component.setupPromise;

    expect(recurringProcessManagerService.startUpdateReadDocsCount.callCount).to.equal(1);
  });

  it('should watch changes in translations, ddoc and user context', async () => {
    await getComponent();

    expect(changesListener['inbox-translations']).to.be.an('object');
    expect(changesListener['inbox-ddoc']).to.be.an('object');
    expect(changesListener['inbox-user-context']).to.be.an('object');
  });

  it('inbox-user-context change listener should filter only logged in user, if exists', async () => {
    sessionService.userCtx.returns({ name: 'adm', roles: ['alpha', 'omega'] });

    await getComponent();

    expect(changesListener['inbox-user-context'].filter({ id: 'something' })).to.equal(false);
    expect(changesListener['inbox-user-context'].filter({ id: 'someperson' })).to.equal(false);
    expect(changesListener['inbox-user-context'].filter({ id: 'org.couchdb.user:someone' })).to.equal(false);
    expect(changesListener['inbox-user-context'].filter({ id: 'org.couchdb.user:adm' })).to.equal(true);

    sessionService.userCtx.returns(false);

    await getComponent();

    expect(changesListener['inbox-user-context'].filter({ doc: { type: 'user-settings', name: 'a' }}))
      .to.equal(false);
  });

  it('inbox-user-context change listener callback should check current session', async () => {
    await getComponent();

    expect(sessionService.init.callCount).to.equal(1);
    changesListener['inbox-user-context'].callback();
    expect(sessionService.init.callCount).to.equal(2);
  });

/* ToDo enable once change listener of sync-status is migrated
  describe('sync status changes', () => {
    it('does nothing if sync in progress', async () => {
      dbSyncService.isSyncInProgress.returns(true);

      await getComponent();

      expect(changesListener['sync-status']).to.be.an('object');
      changesListener['sync-status'].callback();
      expect(dbSyncService.sync.callCount).to.equal(0);
    });

    it('calls sync if not currently syncing', async () => {
      dbSyncService.isSyncInProgress.returns(false);

      await getComponent();

      expect(changesListener['sync-status']).to.be.an('object');
      changesListener['sync-status'].callback();
      expect(dbSyncService.sync.callCount).to.equal(1);
    });
  });
*/
});
