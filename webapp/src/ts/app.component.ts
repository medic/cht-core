import { NavigationEnd, Router, RouterEvent } from '@angular/router';
import * as moment from 'moment';
import { Component } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { setTheme as setBootstrapTheme} from 'ngx-bootstrap/utils';
import { combineLatest } from 'rxjs';

import { DBSyncService } from './services/db-sync.service'
import { Selectors } from './selectors';
import { GlobalActions } from './actions/global';
import { TranslationLoaderService } from './services/translation-loader.service';
import {SessionService} from './services/session.service';
import {AuthService} from './services/auth.service';
import {ResourceIconsService} from './services/resource-icons.service';
import {ChangesService} from './services/changes.service';
import {UpdateServiceWorkerService} from './services/update-service-worker.service';
import {LocationService} from './services/location.service';
import {ModalService} from './modals/mm-modal/mm-modal';
import {ReloadingComponent} from './modals/reloading/reloading.component';
import { FeedbackService } from './services/feedback.service';
import { environment } from './environments/environment';
import { FormatDateService } from './services/format-date.service';
import { XmlFormsService } from './services/xml-forms.service';

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
export class AppComponent {
  private globalActions;
  setupPromise;

  currentTab = '';
  showContent = false;
  privacyPolicyAccepted = true;
  showPrivacyPolicy = false;
  selectMode = false;
  minimalTabs = false;
  adminUrl;
  canLogOut = false;
  tours = [];
  replicationStatus;
  androidAppVersion;

  constructor (
    private dbSyncService:DBSyncService,
    private store: Store,
    private translateService: TranslateService,
    private translationLoaderService: TranslationLoaderService,
    private sessionService: SessionService,
    private authService: AuthService,
    private resourceIconsService: ResourceIconsService,
    private changesService: ChangesService,
    private updateServiceWorker: UpdateServiceWorkerService,
    private locationService: LocationService,
    private modalService: ModalService,
    private router:Router,
    private feedbackService:FeedbackService,
    private formatDateService:FormatDateService,
    private xmlFormsService:XmlFormsService,
  ) {
    combineLatest(
      store.pipe(select(Selectors.getReplicationStatus)),
      store.pipe(select(Selectors.getAndroidAppVersion)),
      store.pipe(select(Selectors.getCurrentTab)),
    )
      .subscribe(([
        replicationStatus,
        androidAppVersion,
        currentTab
      ]) => {
        this.replicationStatus = replicationStatus;
        this.androidAppVersion = androidAppVersion;
        this.currentTab = currentTab;
      });

    this.globalActions = new GlobalActions(store);
    translationLoaderService.getLocale().then(locale => {
      translateService.setDefaultLang(locale);
      translateService.use(locale);
    });

    moment.locale(['en']);
    this.formatDateService.init();

    this.adminUrl = this.locationService.adminPath;

    setBootstrapTheme('bs3');

    this.router.events.subscribe((event:RouterEvent) => {
      console.log(event);
      if (event instanceof NavigationEnd) {
        return this.globalActions.setCurrentTab((event.urlAfterRedirects || event.url).split('/')[1]);
      }
    });
  }

  ngOnInit(): void {
    if (
      (<any>window).medicmobile_android &&
      typeof (<any>window).medicmobile_android.getAppVersion === 'function'
    ) {
      this.globalActions.setAndroidAppVersion((<any>window).medicmobile_android.getAppVersion())
    }

    if (this.androidAppVersion) {
      this.authService.has('can_log_out_on_android').then(canLogout => this.canLogOut = canLogout);
    } else {
      this.canLogOut = true;
    }

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
      setTimeout(() => this.dbSyncService.sync(), 10000);
    } else {
      console.debug('You have administrative privileges; not replicating');
      this.globalActions.updateReplicationStatus({ disabled: true });
    }

    this.setupPromise = this.sessionService.init();
    this.feedbackService.init();

    const dbFetch = (<any>window).PouchDB.fetch;
    (<any>window).PouchDB.fetch = function() {
      return dbFetch
        .apply(this, arguments)
        .then((response) => {
          if (response.status === 401) {
            this.showSessionExpired();
            setTimeout(() => {
              console.info('Redirect to login after 1 minute of inactivity');
              this.session.navigateToLogin();
            }, 60000);
          }
          return response;
        });
    };

    this.changesService.subscribe({
      key: 'branding-icon',
      filter: change => change.id === 'branding',
      callback: () => this.setAppTitle(),
    });
    this.setAppTitle();

    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) {
          console.info('Persistent storage granted: storage will not be cleared except by explicit user action');
        } else {
          console.info('Persistent storage denied: storage may be cleared by the UA under storage pressure.');
        }
      });
    }

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

    this.changesService.subscribe({
      key: 'inbox-translations',
      filter: change => this.translationLoaderService.test(change.id),
      callback: change => this.translateService.reloadLang(this.translationLoaderService.getCode(change.id)),
    });

    this.changesService.subscribe({
      key: 'branding-icon',
      filter: change => change.id === 'branding',
      callback: () => this.setAppTitle(),
    });

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

    const initForms = () => {
      return $translate.onReady()
        .then(() => JsonForms())
        .then(function(jsonForms) {
          const jsonFormSummaries = jsonForms.map(function(jsonForm) {
            return {
              code: jsonForm.code,
              title: translateTitle(jsonForm.translation_key, jsonForm.name),
              icon: jsonForm.icon,
              subjectKey: jsonForm.subject_key
            };
          });
          XmlForms.listen(
            'FormsFilter',
            { contactForms: false, ignoreContext: true },
            function(err, xForms) {
              if (err) {
                return $log.error('Error fetching form definitions', err);
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
              ctrl.setForms(forms);
            }
          );
          // get the forms for the Add Report menu
          XmlForms.listen('AddReportMenu', { contactForms: false }, function(err, xForms) {
            if (err) {
              return $log.error('Error fetching form definitions', err);
            }
            ctrl.nonContactForms = xForms.map(function(xForm) {
              return {
                code: xForm.internalId,
                icon: xForm.icon,
                title: translateTitle(xForm.translation_key, xForm.title),
              };
            });
          });
        })
        .catch(err => $log.error('Failed to retrieve forms', err));
    };

  }

  private setAppTitle() {
    this.resourceIconsService.getAppTitle().then(title => {
      document.title = title;
      (<any>window).$('.header-logo').attr('title', `${title}`);
    });
  }

  private showSessionExpired() {
    /* Modal({
     templateUrl: 'templates/modals/session_expired.html',
     controller: 'SessionExpiredModalCtrl',
     controllerAs: 'SessionExpiredModalCtrl',
     singleton: true,
     });*/
  };

  private showUpdateReady () {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    this.modalService.show(ReloadingComponent, {}, () => {
      console.debug('Delaying update');
      setTimeout(() => {
        this.showUpdateReady();
      }, 5000);
    });
    //closeDropdowns();
  };
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

    DatabaseConnectionMonitor,
    Debug,
    Feedback,

    JsonForms,
    Language,
    LiveListConfig,
    LocationService,
    PrivacyPolicies,
    RecurringProcessManager,

    RulesEngine,

    SetLanguage,
    Snackbar,
    Telemetry,
    Tour,
    TranslateFrom,
    TranslationLoaderService,
    UnreadRecords,
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
        setUnreadCount: globalActions.setUnreadCount,
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

    if ($window.location.href.indexOf('localhost') !== -1) {
      Debug.set(Debug.get()); // Initialize with cookie
    } else {
      // Disable debug for everything but localhost
      Debug.set(false);
    }

    $window.addEventListener('online', () => DBSyncService.setOnlineStatus(true), false);
    $window.addEventListener('offline', () => DBSyncService.setOnlineStatus(false), false);
    ChangesService({
      key: 'sync-status',
      callback: function() {
        if (!DBSyncService.isSyncInProgress()) {
          ctrl.updateReplicationStatus({ current: SYNC_STATUS.required });
          DBSyncService.sync();
        }
      },
    });

    ctrl.dbWarmedUp = true;

    // initialisation tasks that can occur after the UI has been rendered
    ctrl.setupPromise = SessionService.init()
      .then(() => checkPrivacyPolicy())
      .then(() => initRulesEngine())
      .then(() => initForms())
      .then(() => initUnreadCount())
      .then(() => CheckDate())
      .then(() => startRecurringProcesses());

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

    ctrl.unreadCount = {};
    const initUnreadCount = () => {
      UnreadRecords(function(err, data) {
        if (err) {
          return $log.error('Error fetching read status', err);
        }
        ctrl.setUnreadCount(data);
      });
    };

    /!**
     * Translates using the key if truthy using the old style label
     * array as a fallback.
     *!/
    const translateTitle = function(key, label) {
      return key ? $translate.instant(key) : TranslateFrom(label);
    };

    const initRulesEngine = () => RulesEngine.isEnabled()
      .then(isEnabled => $log.info(`RulesEngine Status: ${isEnabled ? 'Enabled' : 'Disabled'}`))
      .catch(err => $log.error('RuleEngine failed to initialize', err));

    const checkPrivacyPolicy = () => {
      return PrivacyPolicies
        .hasAccepted()
        .then(({ privacyPolicy, accepted }={}) => {
          ctrl.setPrivacyPolicyAccepted(accepted);
          ctrl.setShowPrivacyPolicy(privacyPolicy);
        })
        .catch(err => {
          $log.error('Failed to load privacy policy', err);
        });
    };

    // get the forms for the forms filter


    moment.locale(['en']);

    Language()
      .then(function(language) {
        SetLanguage(language, false);
      })
      .catch(function(err) {
        $log.error('Error loading language', err);
      });

    $('body').on('click', '.send-message', function(event) {
      const target = $(event.target).closest('.send-message');
      if (target.hasClass('mm-icon-disabled')) {
        return;
      }
      event.preventDefault();
      Modal({
        templateUrl: 'templates/modals/send_message.html',
        controller: 'SendMessageCtrl',
        controllerAs: 'sendMessageCtrl',
        model: {
          to: target.attr('data-send-to'),
        },
      });
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

    $('body').on('click', '#message-content .message-body', function(e) {
      const elem = $(e.target).closest('.message-body');
      if (!elem.is('.selected')) {
        $('#message-content .selected').removeClass('selected');
        elem.addClass('selected');
      }
    });

    CountMessages.init();

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

    const dbClosedDeregister = $rootScope.$on('databaseClosedEvent', function () {
      Modal({
        templateUrl: 'templates/modals/database_closed.html',
        controller: 'ReloadingModalCtrl',
        controllerAs: 'reloadingModalCtrl',
      });
      closeDropdowns();
    });
    DatabaseConnectionMonitor.listenForDatabaseClosed();

    const showUpdateReady = function() {
      Modal({
        templateUrl: 'templates/modals/version_update.html',
        controller: 'ReloadingModalCtrl',
        controllerAs: 'reloadingModalCtrl',
      }).catch(function() {
        $log.debug('Delaying update');
        $timeout(function() {
          $log.debug('Displaying delayed update ready dialog');
          showUpdateReady();
        }, 2 * 60 * 60 * 1000);
      });
      closeDropdowns();
    };

    const showSessionExpired = function() {
      Modal({
        templateUrl: 'templates/modals/session_expired.html',
        controller: 'SessionExpiredModalCtrl',
        controllerAs: 'SessionExpiredModalCtrl',
        singleton: true,
      });
    };

    ChangesService({
      key: 'inbox-translations',
      filter: change => TranslationLoaderService.test(change.id),
      callback: change => $translate.refresh(TranslationLoaderService.getCode(change.id)),
    });

    const startRecurringProcesses = () => {
      RecurringProcessManager.startUpdateRelativeDate();
      if (SessionService.isOnlineOnly()) {
        RecurringProcessManager.startUpdateReadDocsCount();
      }
    };

    $scope.$on('$destroy', function() {
      unsubscribe();
      dbClosedDeregister();
      RecurringProcessManager.stopUpdateRelativeDate();
      RecurringProcessManager.stopUpdateReadDocsCount();
    });

    const userCtx = SessionService.userCtx();
    ChangesService({
      key: 'inbox-user-context',
      filter: function(change) {
        return (
          userCtx &&
          userCtx.name &&
          change.id === `org.couchdb.user:${userCtx.name}`
        );
      },
      callback: function() {
        SessionService.init().then(refresh => refresh && showUpdateReady());
      },
    });

    AuthService.has('can_write_wealth_quintiles')
      .then(canWriteQuintiles => {
        if (canWriteQuintiles) {
          WealthQuintilesWatcher.start();
        }
      });
  });
})();*/
