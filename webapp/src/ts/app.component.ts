import { ActivationEnd, Router, RouterEvent } from '@angular/router';
import * as moment from 'moment';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { setTheme as setBootstrapTheme} from 'ngx-bootstrap/utils';
import { combineLatest } from 'rxjs';

import { DBSyncService } from '@mm-services/db-sync.service';
import { Selectors } from './selectors';
import { GlobalActions } from '@mm-actions/global';
import { TranslationLoaderService } from '@mm-services/translation-loader.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { ChangesService } from '@mm-services/changes.service';
import { UpdateServiceWorkerService } from '@mm-services/update-service-worker.service';
import { LocationService } from '@mm-services/location.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { ReloadingComponent } from '@mm-modals/reloading/reloading.component';
import { FeedbackService } from '@mm-services/feedback.service';
import { environment } from './environments/environment';
import { FormatDateService } from '@mm-services/format-date.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { JsonFormsService } from '@mm-services/json-forms.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { CountMessageService } from '@mm-services/count-message.service';
import { PrivacyPoliciesService } from '@mm-services/privacy-policies.service';
import { LanguageService, SetLanguageService } from '@mm-services/language.service';
import { StartupModalsService } from '@mm-services/startup-modals.service';
import { TourService } from '@mm-services/tour.service';
import { UnreadRecordsService } from '@mm-services/unread-records.service';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { RecurringProcessManagerService } from '@mm-services/recurring-process-manager.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';
import { CheckDateService } from '@mm-services/check-date.service';
import { SessionExpiredComponent } from '@mm-modals/session-expired/session-expired.component';
import { WealthQuintilesWatcherService } from '@mm-services/wealth-quintiles-watcher.service';
import { DatabaseConnectionMonitorService } from '@mm-services/database-connection-monitor.service';
import { DatabaseClosedComponent } from '@mm-modals/database-closed/database-closed.component';

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
export class AppComponent implements OnInit {
  private globalActions;
  setupPromise;
  translationsLoaded;

  currentTab = '';
  showContent;
  privacyPolicyAccepted = true;
  showPrivacyPolicy = false;
  selectMode;
  minimalTabs;
  adminUrl;
  canLogOut = false;
  replicationStatus;
  androidAppVersion;
  nonContactForms;
  unreadCount = {};

  constructor (
    private dbSyncService:DBSyncService,
    private store:Store,
    private translateService:TranslateService,
    private translationLoaderService:TranslationLoaderService,
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
    private changeDetectorRef:ChangeDetectorRef,
    private countMessageService:CountMessageService,
    private privacyPoliciesService:PrivacyPoliciesService,
    private routeSnapshotService:RouteSnapshotService,
    private startupModalsService:StartupModalsService,
    private tourService:TourService,
    private checkDateService:CheckDateService,
    private unreadRecordsService:UnreadRecordsService,
    private rulesEngineService:RulesEngineService,
    private recurringProcessManagerService:RecurringProcessManagerService,
    private wealthQuintilesWatcherService: WealthQuintilesWatcherService,
    private databaseConnectionMonitorService: DatabaseConnectionMonitorService
  ) {
    this.globalActions = new GlobalActions(store);

    moment.locale(['en']);

    this.formatDateService.init();

    this.adminUrl = this.locationService.adminPath;

    setBootstrapTheme('bs3');
  }

  private loadTranslations() {
    this.translationsLoaded = this.languageService
      .get()
      .then((language) => {
        this.setLanguageService.set(language, false);
        this.globalActions.setTranslationsLoaded();
      })
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

    this.router.events.subscribe((event:RouterEvent) => {
      if (event instanceof ActivationEnd) {
        const tab = getTab(event.snapshot);
        if (tab !== this.currentTab) {
          this.tourService.endCurrent();
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
      lastSuccessTo: parseInt(window.localStorage.getItem('medic-last-replicated-date')),
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
          if (response.status === 401) {
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
      if (state === 'disabled') {
        this.globalActions.updateReplicationStatus({ disabled: true });
        return;
      }

      if (state === 'unknown') {
        this.globalActions.updateReplicationStatus({ current: SYNC_STATUS.unknown });
        return;
      }

      const now = Date.now();
      const lastTrigger = this.replicationStatus.lastTrigger;
      const delay = lastTrigger ? Math.round((now - lastTrigger) / 1000) : 'unknown';

      if (state === 'inProgress') {
        this.globalActions.updateReplicationStatus({
          current: SYNC_STATUS.inProgress,
          lastTrigger: now
        });
        console.info(`Replication started after ${delay} seconds since previous attempt`);
        return;
      }

      const statusUpdates:any = {};
      if (to === 'success') {
        statusUpdates.lastSuccessTo = now;
      }
      if (from === 'success') {
        statusUpdates.lastSuccessFrom = now;
      }
      if (to === 'success' && from === 'success') {
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
    this.subscribeToStore();
    this.setupRouter();
    this.loadTranslations();
    this.setupDb();
    this.countMessageService.init();
    this.feedbackService.init();

    // initialisation tasks that can occur after the UI has been rendered
    this.setupPromise = this.sessionService
      .init()
      .then(() => this.checkPrivacyPolicy())
      .then(() => this.initRulesEngine())
      .then(() => this.initForms())
      .then(() => this.initUnreadCount())
      .then(() => this.checkDateService.check())
      .then(() => this.startRecurringProcesses());

    this.globalActions.setIsAdmin(this.sessionService.isAdmin());
    this.watchChangesBranding();
    this.watchChangesInboxDDoc();
    this.watchUserContextChanges();
    this.watchTranslationsChanges();
    this.watchDBSyncStatus();
    this.watchDatabaseConnection();
    this.setAppTitle();
    this.setupAndroidVersion();
    this.requestPersistentStorage();
    this.startWealthQuintiles();
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

  private watchChangesBranding() {
    this.changesService.subscribe({
      key: 'branding-icon',
      filter: change => change.id === 'branding',
      callback: () => this.setAppTitle(),
    });
  }

  private watchChangesInboxDDoc() {
    this.changesService.subscribe({
      key: 'inbox-ddoc',
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
          this.updateServiceWorker.update(() => this.showUpdateReady());
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
      key: 'inbox-user-context',
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
      key: 'inbox-translations',
      filter: change => this.translationLoaderService.test(change.id),
      callback: change => this.translateService.reloadLang(this.translationLoaderService.getCode(change.id)),
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
          this.dbSyncService.sync();
        }
      },
    });
  }

  private watchDatabaseConnection() {
    this.databaseConnectionMonitorService
      .listenForDatabaseClosed()
      .subscribe(() => {
        this.modalService
          .show(DatabaseClosedComponent)
          .catch(() => {});

        // ToDo: closeDropdowns();
      });
  }

  private subscribeToStore() {
    combineLatest(
      this.store.select(Selectors.getReplicationStatus),
      this.store.select(Selectors.getAndroidAppVersion),
      this.store.select(Selectors.getCurrentTab),
      this.store.select(Selectors.getMinimalTabs),
      this.store.select(Selectors.getShowContent),
      this.store.select(Selectors.getPrivacyPolicyAccepted),
      this.store.select(Selectors.getShowPrivacyPolicy),
      this.store.select(Selectors.getSelectMode),
    ).subscribe(([
      replicationStatus,
      androidAppVersion,
      currentTab,
      minimalTabs,
      showContent,
      privacyPolicyAccepted,
      showPrivacyPolicy,
      selectMode,
    ]) => {
      this.replicationStatus = replicationStatus;
      this.androidAppVersion = androidAppVersion;
      this.currentTab = currentTab;
      this.minimalTabs = minimalTabs;
      this.showContent = showContent;
      this.showPrivacyPolicy = showPrivacyPolicy;
      this.privacyPolicyAccepted = privacyPolicyAccepted;
      this.selectMode = selectMode;
      this.changeDetectorRef.detectChanges();
    });
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
            code: jsonForm.code,
            title: translateTitle(jsonForm.translation_key, jsonForm.name),
            icon: jsonForm.icon,
            subjectKey: jsonForm.subject_key
          };
        });
        this.xmlFormsService.subscribe(
          'FormsFilter',
          { contactForms: false, ignoreContext: true },
          (err, xForms) => {
            if (err) {
              return console.error('Error fetching form definitions', err);
            }
            const xFormSummaries = xForms.map(function(xForm) {
              return {
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
        // get the forms for the Add Report menu
        this.xmlFormsService.subscribe('AddReportMenu', { contactForms: false }, (err, xForms) => {
          if (err) {
            return console.error('Error fetching form definitions', err);
          }
          this.nonContactForms = xForms
            .map((xForm) => ({
              code: xForm.internalId,
              icon: xForm.icon,
              title: translateTitle(xForm.translation_key, xForm.title),
            }))
            .sort((a, b) => a.title - b.title);
        });
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
    this.modalService
      .show(SessionExpiredComponent)
      .catch(() => {});
  }

  private showUpdateReady() {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    this.modalService
      .show(ReloadingComponent)
      .catch(() => {
        console.debug('Delaying update');
        setTimeout(() => {
          this.showUpdateReady();
        }, TWO_HOURS);
      });
    // ToDo closeDropdowns();
  }

  private checkPrivacyPolicy() {
    return this.privacyPoliciesService
      .hasAccepted()
      .then(({ privacyPolicy, accepted }: any = {}) => {
        this.globalActions.setPrivacyPolicyAccepted(accepted);
        this.globalActions.setShowPrivacyPolicy(privacyPolicy);
        return { privacyPolicy, accepted };
      })
      .catch(err => console.error('Failed to load privacy policy', err))
      .then(({ privacyPolicy, accepted }: any = {}) => {
        if (!privacyPolicy || accepted) {
          // If there is no privacy policy or the user already
          // accepted the policy show the startup modals,
          // otherwise the modals will start from the privacy
          // policy component after the user accepts the terms
          this.startupModalsService.showStartupModals();
        }
      });
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
      .then(isEnabled => console.info(`RulesEngine Status: ${ isEnabled ? 'Enabled' : 'Disabled' }`))
      .catch(err => console.error('RuleEngine failed to initialize', err));
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
}



/*(function() {
  'use strict';

  angular.module('inboxControllers', []);

  angular.module('inboxControllers').controller('InboxCtrl', function(
    $log,
    $ngRedux,
    $rootScope,
    $scope,
    $state,
    $timeout,
    $transitions,
    $translate,
    $window,


    CheckDate,
    CountMessages,

    Debug,
    Feedback,
    JsonForms,
    Language,
    LiveListConfig,
    LocationService,
    SetLanguage,
    Snackbar,
    Telemetry,
    Tour,
    TranslateFrom,
    TranslationLoaderService,
    UpdateServiceWorkerService,
    WealthQuintilesWatcher,
    XmlForms
  ) {
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        androidAppVersion: Selectors.getAndroidAppVersion(state),
        cancelCallback: Selectors.getCancelCallback(state),
        currentTab: Selectors.getCurrentTab(state),
        enketoEdited: Selectors.getEnketoEditedStatus(state),
        enketoSaving: Selectors.getEnketoSavingStatus(state),
        forms: Selectors.getForms(state),
        minimalTabs : Selectors.getMinimalTabs(state),
        privacyPolicyAccepted: Selectors.getPrivacyPolicyAccepted(state),
        replicationStatus: Selectors.getReplicationStatus(state),
        selectMode: Selectors.getSelectMode(state),
        showContent: Selectors.getShowContent(state),
        showPrivacyPolicy: Selectors.getShowPrivacyPolicy(state),
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      return {
        navigateBack: globalActions.navigateBack,
        navigationCancel: globalActions.navigationCancel,
        setAndroidAppVersion: globalActions.setAndroidAppVersion,
        setCurrentTab: globalActions.setCurrentTab,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setForms: globalActions.setForms,
        setIsAdmin: globalActions.setIsAdmin,
        setLoadingContent: globalActions.setLoadingContent,
        setLoadingSubActionBar: globalActions.setLoadingSubActionBar,
        setPrivacyPolicyAccepted: globalActions.setPrivacyPolicyAccepted,
        setSelectMode: globalActions.setSelectMode,
        setShowActionBar: globalActions.setShowActionBar,
        setShowContent: globalActions.setShowContent,
        setShowPrivacyPolicy: globalActions.setShowPrivacyPolicy,
        setTitle: globalActions.setTitle,
        unsetSelected: globalActions.unsetSelected,
        updateReplicationStatus: globalActions.updateReplicationStatus,
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);


    $window.startupTimes.angularBootstrapped = performance.now();
    Telemetry.record(
      'boot_time:1:to_first_code_execution',
      $window.startupTimes.firstCodeExecution - $window.startupTimes.start
    );
    Telemetry.record(
      'boot_time:2:to_bootstrap',
      $window.startupTimes.bootstrapped - $window.startupTimes.firstCodeExecution
    );
    Telemetry.record(
      'boot_time:3:to_angular_bootstrap',
      $window.startupTimes.angularBootstrapped - $window.startupTimes.bootstrapped
    );
    Telemetry.record('boot_time', $window.startupTimes.angularBootstrapped - $window.startupTimes.start);
    delete $window.startupTimes;

    ctrl.dbWarmedUp = true;

    LiveListConfig();

    ctrl.setLoadingContent(false);
    ctrl.setLoadingSubActionBar(false);
    ctrl.adminUrl = LocationService.adminPath;
    ctrl.setIsAdmin(SessionService.isAdmin());
    ctrl.modalsToShow = [];

    $transitions.onBefore({}, (trans) => {
      if (ctrl.enketoEdited && ctrl.cancelCallback) {
        ctrl.navigationCancel({ to: trans.to(), params: trans.params() });
        return false;
      }
    });

    $transitions.onStart({}, function(trans) {
      const statesToUnsetSelected = ['contacts', 'messages', 'reports', 'tasks'];
      const parentState = statesToUnsetSelected.find(state => trans.from().name.startsWith(state));
      // unset selected when states have different base state and only when source state has selected property
      if (parentState && !trans.to().name.startsWith(parentState)) {
        ctrl.unsetSelected();
      }
    });

    $transitions.onSuccess({}, function(trans) {
      Tour.endCurrent();
      ctrl.setCurrentTab(trans.to().name.split('.')[0]);
      if (!$state.includes('reports')) {
        ctrl.setSelectMode(false);
      }
    });

    // get the forms for the forms filter

    Language()
      .then(function(language) {
        SetLanguage(language, false);
      })
      .catch(function(err) {
        $log.error('Error loading language', err);
      });

    $('body').on('mouseenter', '.relative-date, .autoreply', function() {
      if ($(this).data('tooltipLoaded') !== true) {
        $(this)
          .data('tooltipLoaded', true)
          .tooltip({
            placement: 'bottom',
            trigger: 'manual',
            container: $(this).closest('.inbox-items, .item-content, .page'),
          })
          .tooltip('show');
      }
    });
    $('body').on('mouseleave', '.relative-date, .autoreply', function() {
      if ($(this).data('tooltipLoaded') === true) {
        $(this)
          .data('tooltipLoaded', false)
          .tooltip('hide');
      }
    });

    // close select2 dropdowns in the background
    const closeDropdowns = function() {
      $('select.select2-hidden-accessible').each(function() {
        // prevent errors being thrown if selectors have not been
        // initialised yet
        try {
          $(this).select2('close');
        } catch (e) {
          // exception thrown on clicking 'close'
        }
      });
    };

    // close all select2 menus on navigation
    // https://github.com/medic/medic/issues/2927
    $transitions.onStart({}, closeDropdowns);

  });
})();*/
