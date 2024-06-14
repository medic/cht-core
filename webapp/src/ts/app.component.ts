import { ActivationEnd, ActivationStart, Router } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import * as moment from 'moment';
import { AfterViewInit, Component, HostListener, NgZone, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { setTheme as setBootstrapTheme } from 'ngx-bootstrap/utils';
import { combineLatest, take } from 'rxjs';

import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { ChangesService } from '@mm-services/changes.service';
import { UpdateServiceWorkerService } from '@mm-services/update-service-worker.service';
import { LocationService } from '@mm-services/location.service';
import { ModalService } from '@mm-services/modal.service';
import { ReloadingComponent } from '@mm-modals/reloading/reloading.component';
import { FeedbackService } from '@mm-services/feedback.service';
import { environment } from '@mm-environments/environment';
import { FormatDateService } from '@mm-services/format-date.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { JsonFormsService } from '@mm-services/json-forms.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { CountMessageService } from '@mm-services/count-message.service';
import { PrivacyPoliciesService } from '@mm-services/privacy-policies.service';
import { LanguageService, SetLanguageService } from '@mm-services/language.service';
import { UnreadRecordsService } from '@mm-services/unread-records.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { RecurringProcessManagerService } from '@mm-services/recurring-process-manager.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';
import { CheckDateService } from '@mm-services/check-date.service';
import { SessionExpiredComponent } from '@mm-modals/session-expired/session-expired.component';
import { WealthQuintilesWatcherService } from '@mm-services/wealth-quintiles-watcher.service';
import { DatabaseConnectionMonitorService } from '@mm-services/database-connection-monitor.service';
import { DatabaseClosedComponent } from '@mm-modals/database-closed/database-closed.component';
import { TranslationDocsMatcherProvider } from '@mm-providers/translation-docs-matcher.provider';
import { TranslateLocaleService } from '@mm-services/translate-locale.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { TranslateService } from '@mm-services/translate.service';
import { AnalyticsModulesService } from '@mm-services/analytics-modules.service';
import { AnalyticsActions } from '@mm-actions/analytics';
import { TrainingCardsService } from '@mm-services/training-cards.service';
import { OLD_REPORTS_FILTER_PERMISSION } from '@mm-modules/reports/reports-filters.component';
import { OLD_ACTION_BAR_PERMISSION } from '@mm-components/actionbar/actionbar.component';
import { BrowserDetectorService } from '@mm-services/browser-detector.service';
import { BrowserCompatibilityComponent } from '@mm-modals/browser-compatibility/browser-compatibility.component';
import { PerformanceService } from '@mm-services/performance.service';

const SYNC_STATUS = {
  inProgress: {
    icon: 'fa-refresh',
    key: 'sync.status.in_progress',
    disableSyncButton: true
  },
  success: {
    icon: 'fa-check',
    key: 'sync.status.not_required',
    className: 'success'
  },
  required: {
    icon: 'fa-exclamation-triangle',
    key: 'sync.status.required',
    className: 'required'
  },
  unknown: {
    icon: 'fa-info-circle',
    key: 'sync.status.unknown'
  }
};


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, AfterViewInit {
  private globalActions: GlobalActions;
  private analyticsActions: AnalyticsActions;
  setupPromise;
  translationsLoaded;

  currentTab = '';
  privacyPolicyAccepted;
  isSidebarFilterOpen = false;
  showPrivacyPolicy;
  selectMode;
  adminUrl;
  canLogOut;
  replicationStatus;
  androidAppVersion;
  reportForms;
  unreadCount = {};
  useOldActionBar = false;
  initialisationComplete = false;
  trainingCardFormId = false;

  constructor (
    private dbSyncService:DBSyncService,
    private store:Store,
    private translateService:TranslateService,
    private languageService:LanguageService,
    private setLanguageService:SetLanguageService,
    private sessionService:SessionService,
    private authService:AuthService,
    private resourceIconsService:ResourceIconsService,
    private changesService:ChangesService,
    private updateServiceWorker:UpdateServiceWorkerService,
    private locationService:LocationService,
    private modalService:ModalService,
    private router:Router,
    private feedbackService:FeedbackService,
    private formatDateService:FormatDateService,
    private xmlFormsService:XmlFormsService,
    private jsonFormsService:JsonFormsService,
    private translateFromService:TranslateFromService,
    private countMessageService:CountMessageService,
    private privacyPoliciesService:PrivacyPoliciesService,
    private routeSnapshotService:RouteSnapshotService,
    private checkDateService:CheckDateService,
    private unreadRecordsService:UnreadRecordsService,
    private rulesEngineService:RulesEngineService,
    private recurringProcessManagerService:RecurringProcessManagerService,
    private wealthQuintilesWatcherService: WealthQuintilesWatcherService,
    private databaseConnectionMonitorService: DatabaseConnectionMonitorService,
    private translateLocaleService:TranslateLocaleService,
    private telemetryService:TelemetryService,
    private performanceService:PerformanceService,
    private transitionsService:TransitionsService,
    private ngZone:NgZone,
    private chtDatasourceService: CHTDatasourceService,
    private analyticsModulesService: AnalyticsModulesService,
    private trainingCardsService: TrainingCardsService,
    private matIconRegistry: MatIconRegistry,
    private browserDetectorService: BrowserDetectorService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.analyticsActions = new AnalyticsActions(store);

    this.matIconRegistry.registerFontClassAlias('fontawesome', 'fa');
    this.matIconRegistry.setDefaultFontSetClass('fa');
    moment.locale(['en']);

    this.formatDateService.init();

    this.adminUrl = this.locationService.adminPath;

    setBootstrapTheme('bs4');
  }

  private loadTranslations() {
    this.translationsLoaded = this.languageService
      .get()
      .then((language) => this.setLanguageService.set(language, false))
      .then(() => this.globalActions.setTranslationsLoaded())
      .catch(err => {
        console.error('Error loading language', err);
      });
  }

  private setupRouter() {
    const getTab = (snapshot) => {
      let tab;
      do {
        tab = snapshot.data.tab;
        snapshot = snapshot.parent;
      } while (!tab && snapshot?.parent);
      return tab;
    };

    this.router.events.subscribe((event:ActivationStart|ActivationEnd) => {
      // close all select2 menus on navigation
      // https://github.com/medic/cht-core/issues/2927
      if (event instanceof ActivationStart) {
        this.closeDropdowns();
      }

      if (event instanceof ActivationEnd) {
        const tab = getTab(event.snapshot);
        if (tab !== this.currentTab) {
          this.globalActions.setCurrentTab(tab);
        }
        const data = this.routeSnapshotService.get()?.data;
        this.globalActions.setSnapshotData(data);
      }
    });
  }

  private setupDb() {
    this.globalActions.updateReplicationStatus({
      disabled: false,
      lastTrigger: undefined,
      lastSuccessTo: parseInt(window.localStorage.getItem('medic-last-replicated-date')!),
    });

    // Set this first because if there are any bugs in configuration
    // we want to ensure dbsync still happens so they can be fixed
    // automatically.
    if (this.dbSyncService.isEnabled()) {
      // Delay it by 10 seconds so it doesn't slow down initial load.
      setTimeout(() => this.dbSyncService.sync(), 10 * 1000);
    } else {
      console.debug('You have administrative privileges; not replicating');
      this.globalActions.updateReplicationStatus({ disabled: true });
    }

    const dbFetch = window.PouchDB.fetch;
    window.PouchDB.fetch = (...args) => {
      return dbFetch
        .apply(dbFetch, args)
        .then((response) => {
          // ignore 401 that could come through other channels than CHT API
          if (response.status === 401 && response.headers?.get('logout-authorization') === 'CHT-Core API') {
            this.showSessionExpired();
            setTimeout(() => {
              console.info('Redirect to login after 1 minute of inactivity');
              this.sessionService.navigateToLogin();
            }, 60000);
          }
          return response;
        });
    };

    this.dbSyncService.subscribe(({ state, to, from }) => {
      if (state === SyncStatus.Disabled) {
        this.globalActions.updateReplicationStatus({ disabled: true });
        return;
      }

      if (state === SyncStatus.Unknown) {
        this.globalActions.updateReplicationStatus({ current: SYNC_STATUS.unknown });
        return;
      }

      const now = Date.now();
      const lastTrigger = this.replicationStatus.lastTrigger;
      const delay = lastTrigger ? Math.round((now - lastTrigger) / 1000) : 'unknown';

      if (state === SyncStatus.InProgress) {
        this.globalActions.updateReplicationStatus({
          current: SYNC_STATUS.inProgress,
          lastTrigger: now
        });
        console.info(`Replication started after ${delay} seconds since previous attempt`);
        return;
      }

      const statusUpdates:any = {};
      if (to === SyncStatus.Success) {
        statusUpdates.lastSuccessTo = now;
      }
      if (from === SyncStatus.Success) {
        statusUpdates.lastSuccessFrom = now;
      }
      if (to === SyncStatus.Success && from === SyncStatus.Success) {
        console.info(`Replication succeeded after ${delay} seconds`);
        statusUpdates.current = SYNC_STATUS.success;
      } else {
        console.info(`Replication failed after ${delay} seconds`);
        statusUpdates.current = SYNC_STATUS.required;
      }
      this.globalActions.updateReplicationStatus(statusUpdates);
    });
  }

  ngOnInit(): void {
    this.recordStartupTelemetry();
    this.subscribeToStore();
    this.setupRouter();
    this.loadTranslations();
    this.setupDb();
    this.countMessageService.init();
    this.feedbackService.init();
    this.sessionService.init();
    this.warnOutdatedChrome();

    // initialisation tasks that can occur after the UI has been rendered
    this.setupPromise = Promise.resolve()
      .then(() => this.chtDatasourceService.isInitialized())
      .then(() => this.checkPrivacyPolicy())
      .then(() => (this.initialisationComplete = true))
      .then(() => this.initRulesEngine())
      .then(() => this.initTransitions())
      .then(() => this.initForms())
      .then(() => this.initUnreadCount())
      .then(() => this.checkDateService.check(true))
      .then(() => this.startRecurringProcesses())
      .catch(err => {
        this.initialisationComplete = true;
        console.error('Error during initialisation', err);
        this.router.navigate(['/error', '503' ]);
      });

    this.watchBrandingChanges();
    this.watchDDocChanges();
    this.watchUserContextChanges();
    this.watchTranslationsChanges();
    this.watchDBSyncStatus();
    this.watchDatabaseConnection();
    this.setAppTitle();
    this.setupAndroidVersion();
    this.requestPersistentStorage();
    this.startWealthQuintiles();
    this.initAnalyticsModules();
  }

  ngAfterViewInit() {
    this.enableOldActionBar();
    this.subscribeToSideFilterStore();
  }

  private initTransitions() {
    if (!this.sessionService.isOnlineOnly()) {
      return this.transitionsService.init();
    }
  }

  private setupAndroidVersion() {
    if (typeof window.medicmobile_android?.getAppVersion === 'function') {
      this.globalActions.setAndroidAppVersion(window.medicmobile_android.getAppVersion());
    }

    if (this.androidAppVersion) {
      this.authService
        .has('can_log_out_on_android')
        .then(canLogout => this.canLogOut = canLogout);
    } else {
      this.canLogOut = true;
    }
  }

  private requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage
        .persist()
        .then(granted => {
          if (granted) {
            console.info('Persistent storage granted: storage will not be cleared except by explicit user action');
          } else {
            console.info('Persistent storage denied: storage may be cleared by the UA under storage pressure.');
          }
        });
    }
  }

  private watchBrandingChanges() {
    this.changesService.subscribe({
      key: 'branding-icon',
      filter: change => change.id === 'branding',
      callback: () => this.setAppTitle(),
    });
  }

  private watchDDocChanges() {
    this.changesService.subscribe({
      key: 'ddoc',
      filter: (change) => {
        return (
          change.id === '_design/medic' ||
          change.id === '_design/medic-client' ||
          change.id === 'service-worker-meta' ||
          change.id === 'settings'
        );
      },
      callback: (change) => {
        if (change.id === 'service-worker-meta') {
          this.updateServiceWorker.update(() => this.ngZone.run(() => this.showUpdateReady()));

        } else {
          !environment.production && this.globalActions.setSnackbarContent(`${change.id} changed`);
          this.showUpdateReady();
        }
      },
    });
  }

  private watchUserContextChanges() {
    const userCtx = this.sessionService.userCtx();
    this.changesService.subscribe({
      key: 'user-context',
      filter: (change) => {
        return (
          userCtx &&
          userCtx.name &&
          change.id === `org.couchdb.user:${userCtx.name}`
        );
      },
      callback: () => {
        this.sessionService.init().then(refresh => refresh && this.showUpdateReady());
      },
    });
  }

  private watchTranslationsChanges() {
    this.changesService.subscribe({
      key: 'translations',
      filter: change => TranslationDocsMatcherProvider.test(change.id),
      callback: change => {
        const locale = TranslationDocsMatcherProvider.getLocaleCode(change.id);
        return this.languageService
          .get()
          .then(enabledLocale => {
            const hotReload = enabledLocale === locale;
            return this.translateLocaleService.reloadLang(locale, hotReload);
          });
      },
    });
  }

  private watchDBSyncStatus() {
    window.addEventListener('online', () => this.dbSyncService.setOnlineStatus(true), false);
    window.addEventListener('offline', () => this.dbSyncService.setOnlineStatus(false), false);

    this.changesService.subscribe({
      key: 'sync-status',
      callback: () => {
        if (!this.dbSyncService.isSyncInProgress()) {
          this.globalActions.updateReplicationStatus({ current: SYNC_STATUS.required });
          this.dbSyncService.sync(false, true);
        }
      },
    });
  }

  private watchDatabaseConnection() {
    this.databaseConnectionMonitorService
      .listenForDatabaseClosed()
      .subscribe(() => {
        this.modalService.show(DatabaseClosedComponent);
        this.closeDropdowns();
      });
  }

  private subscribeToStore() {
    combineLatest([
      this.store.select(Selectors.getReplicationStatus),
      this.store.select(Selectors.getAndroidAppVersion),
      this.store.select(Selectors.getCurrentTab),
      this.store.select(Selectors.getSelectMode),
    ]).subscribe(([
      replicationStatus,
      androidAppVersion,
      currentTab,
      selectMode,
    ]) => {
      this.replicationStatus = replicationStatus;
      this.androidAppVersion = androidAppVersion;
      this.currentTab = currentTab;

      this.selectMode = selectMode;
    });

    combineLatest([
      this.store.select(Selectors.getPrivacyPolicyAccepted),
      this.store.select(Selectors.getShowPrivacyPolicy),
      this.store.select(Selectors.getTrainingCardFormId),
    ]).subscribe(([
      privacyPolicyAccepted,
      showPrivacyPolicy,
      trainingCardFormId,
    ]) => {
      this.showPrivacyPolicy = showPrivacyPolicy;
      this.privacyPolicyAccepted = privacyPolicyAccepted;
      this.trainingCardFormId = trainingCardFormId;
      this.displayTrainingCards();
    });
  }

  private displayTrainingCards() {
    if (this.showPrivacyPolicy && !this.privacyPolicyAccepted) {
      return;
    }
    if (!this.trainingCardFormId) {
      return;
    }

    this.trainingCardsService.displayTrainingCards();
  }

  private async subscribeToSideFilterStore() {
    const isDisabled = !this.sessionService.isAdmin() && await this.authService.has(OLD_REPORTS_FILTER_PERMISSION);

    if (isDisabled) {
      return;
    }

    this.store
      .select(Selectors.getSidebarFilter)
      .subscribe(({ isOpen }) => this.isSidebarFilterOpen = !!isOpen);
  }

  private async enableOldActionBar() {
    this.useOldActionBar = !this.sessionService.isAdmin() && await this.authService.has(OLD_ACTION_BAR_PERMISSION);
  }

  private initForms() {
    /**
     * Translates using the key if truthy using the old style label
     * array as a fallback.
     */
    const translateTitle = (key, label) => {
      return key ? this.translateService.instant(key) : this.translateFromService.get(label);
    };

    return this.translationsLoaded
      .then(() => this.jsonFormsService.get())
      .then((jsonForms) => {
        const jsonFormSummaries = jsonForms.map((jsonForm) => {
          return {
            id: jsonForm.code,
            code: jsonForm.code,
            title: translateTitle(jsonForm.translation_key, jsonForm.name),
            icon: jsonForm.icon,
            subjectKey: jsonForm.subject_key
          };
        });
        this.xmlFormsService.subscribe(
          'FormsFilter',
          { reportForms: true, ignoreContext: true },
          (err, xForms) => {
            if (err) {
              return console.error('Error fetching form definitions', err);
            }
            const xFormSummaries = xForms.map(function(xForm) {
              return {
                id: xForm._id,
                code: xForm.internalId,
                title: translateTitle(xForm.translation_key, xForm.title),
                icon: xForm.icon,
                subjectKey: xForm.subject_key
              };
            });
            const forms = xFormSummaries.concat(jsonFormSummaries);
            this.globalActions.setForms(forms);
          }
        );

        // ToDo: remove when deprecating Action Bar Component. This subscribe gets the forms for the Add Report action.
        this.xmlFormsService.subscribe(
          'AddReportMenu',
          { reportForms: true },
          (err, xForms) => {
            if (err) {
              return console.error('Error fetching form definitions', err);
            }
            this.reportForms = xForms
              .map((xForm) => ({
                id: xForm._id,
                code: xForm.internalId,
                icon: xForm.icon,
                title: translateTitle(xForm.translation_key, xForm.title),
              }))
              .sort((a, b) => a.title - b.title);
          }
        );

        // Get forms for training cards and display the cards if necessary
        this.trainingCardsService.initTrainingCards();
      })
      .catch(err => console.error('Failed to retrieve forms', err));
  }

  private setAppTitle() {
    this.resourceIconsService
      .getAppTitle()
      .then(title => {
        document.title = title;
        $('.header-logo').attr('title', `${title}`);
      });
  }

  private showSessionExpired() {
    this.modalService.show(SessionExpiredComponent);
  }

  private showUpdateReady() {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    this.modalService
      .show(ReloadingComponent)
      .afterClosed()
      .pipe(take(1))
      .subscribe(reloaded => {
        if (reloaded) {
          return;
        }
        console.debug('Delaying update');
        setTimeout(() => this.showUpdateReady(), TWO_HOURS);
      });
    this.closeDropdowns();
  }

  private checkPrivacyPolicy() {
    return this.privacyPoliciesService
      .hasAccepted()
      .then(({ privacyPolicy, accepted }: any = {}) => {
        this.globalActions.setPrivacyPolicyAccepted(accepted);
        this.globalActions.setShowPrivacyPolicy(privacyPolicy);
      })
      .catch(err => console.error('Failed to load privacy policy', err));
  }

  private initUnreadCount() {
    this.unreadRecordsService.init((err, data) => {
      if (err) {
        console.error('Error fetching read status', err);
        return;
      }
      this.globalActions.setUnreadCount(data);
    });
  }

  private initRulesEngine() {
    return this.rulesEngineService
      .isEnabled()
      .then(isEnabled => console.info(`RulesEngine Status: ${isEnabled ? 'Enabled' : 'Disabled'}`))
      .catch(err => {
        console.error('RuleEngine failed to initialize', err);
      });
  }

  private startRecurringProcesses() {
    this.recurringProcessManagerService.startUpdateRelativeDate();

    if (this.sessionService.isOnlineOnly()) {
      this.recurringProcessManagerService.startUpdateReadDocsCount();
    }
  }

  private startWealthQuintiles() {
    this.authService
      .has('can_write_wealth_quintiles')
      .then(canWriteQuintiles => {
        if (canWriteQuintiles) {
          this.wealthQuintilesWatcherService.start();
        }
      });
  }

  // close select2 dropdowns in the background
  private closeDropdowns() {
    $('select.select2-hidden-accessible').each((idx, element) => {
      // prevent errors being thrown if selectors have not been
      // initialised yet
      try {
        $(element).select2('close');
      } catch (e) {
        // exception thrown on clicking 'close'
      }
    });
  }

  private async warnOutdatedChrome(): Promise<void> {
    if (!this.browserDetectorService.isUsingOutdatedBrowser()) {
      return;
    }
    await this.translationsLoaded;
    this.modalService.show(BrowserCompatibilityComponent);
  }

  private recordStartupTelemetry() {
    window.startupTimes.angularBootstrapped = performance.now();
    this.performanceService.recordPerformance(
      { name: 'boot_time:1:to_first_code_execution' },
      window.startupTimes.firstCodeExecution - window.startupTimes.start
    );

    if (window.startupTimes.replication) {
      this.performanceService.recordPerformance(
        { name: 'boot_time:2_1:to_replication' },
        window.startupTimes.replication,
      );
    }

    if (window.startupTimes.purgingMetaFailed) {
      console.error(`Error when purging meta on device startup: ${window.startupTimes.purgingMetaFailed}`);
      this.telemetryService.record('boot_time:purging_meta_failed');
    } else {
      // When: 1- Purging ran and successfully completed. 2- Purging didn't run.
      this.telemetryService.record(`boot_time:purging_meta:${!!window.startupTimes.purgingMeta}`);
    }

    if (window.startupTimes.purgeMeta) {
      this.performanceService.recordPerformance(
        { name: 'boot_time:2_3:to_purge_meta' },
        window.startupTimes.purgeMeta,
      );
    }

    this.performanceService.recordPerformance(
      { name: 'boot_time:2:to_bootstrap' },
      window.startupTimes.bootstrapped - window.startupTimes.firstCodeExecution,
    );

    this.performanceService.recordPerformance(
      { name: 'boot_time:3:to_angular_bootstrap' },
      window.startupTimes.angularBootstrapped - window.startupTimes.bootstrapped,
    );

    this.performanceService.recordPerformance(
      { name: 'boot_time', recordApdex: true },
      window.startupTimes.angularBootstrapped - window.startupTimes.start
    );
  }

  @HostListener('window:beforeunload')
  private stopWatchingChanges() {
    // avoid Failed to fetch errors being logged when the browser window is reloaded
    this.changesService.killWatchers();
  }

  @HostListener('window:pageshow', ['$event'])
  private pageshow(event) {
    if (event.persisted) {
      this.sessionService.check();
    }
  }

  private async initAnalyticsModules() {
    try {
      const modules = await this.analyticsModulesService.get();
      this.analyticsActions.setAnalyticsModules(modules);
    } catch (error) {
      console.error('Error while initializing analytics modules', error);
    }
  }
}
