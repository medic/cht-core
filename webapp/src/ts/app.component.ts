const moment = require('moment');
import { Component } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { TranslateService } from "@ngx-translate/core";
import { setTheme } from 'ngx-bootstrap/utils';

import { DBSync } from './services/db-sync.service'
import { Selectors } from "./selectors";
import { GlobalActions } from "./actions/global";
import { TranslationLoader } from './services/translation-loader.service';
import {Session} from "./services/session.service";
import {Auth} from "./services/auth.service";
import {ResourceIcons} from "./services/resource-icons.service";
import {Changes} from "./services/changes.service";
import {UpdateServiceWorker} from "./services/update-service-worker.service";
import {Location} from "./services/location.service";
import {ModalService} from './modals/mm-modal/mm-modal';
import {ReloadingComponent} from "./modals/reloading/reloading.component";

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
    private dbSync:DBSync,
    private store: Store,
    private translate: TranslateService,
    private translationLoader: TranslationLoader,
    private session: Session,
    private auth: Auth,
    private resourceIcons: ResourceIcons,
    private changes: Changes,
    private updateServiceWorker: UpdateServiceWorker,
    private location: Location,
    private modalService: ModalService,
  ) {
    this.replicationStatus = store.pipe(select(Selectors.getReplicationStatus));
    this.androidAppVersion = store.pipe(select(Selectors.getAndroidAppVersion));
    this.globalActions = new GlobalActions(store);
    translationLoader.getLocale().then(locale => {
      translate.setDefaultLang(locale);
      translate.use(locale);
    });

    moment.locale(['en']);

    this.adminUrl = this.location.adminPath;
    setTheme('bs3');
  }

  ngOnInit(): void {
    if (
      (<any>window).medicmobile_android &&
      typeof (<any>window).medicmobile_android.getAppVersion === 'function'
    ) {
      this.globalActions.setAndroidAppVersion((<any>window).medicmobile_android.getAppVersion())
    }

    if (this.androidAppVersion) {
      this.auth.has('can_log_out_on_android').then(canLogout => this.canLogOut = canLogout);
    } else {
      this.canLogOut = true;
    }

    this.globalActions.updateReplicationStatus({
      disabled: false,
      lastTrigger: undefined,
      lastSuccessTo: parseInt(window.localStorage.getItem('medic-last-replicated-date')),
      current: {},
    });

    // Set this first because if there are any bugs in configuration
    // we want to ensure dbsync still happens so they can be fixed
    // automatically.
    if (this.dbSync.isEnabled()) {
      // Delay it by 10 seconds so it doesn't slow down initial load.
      setTimeout(() => this.dbSync.sync(), 10000);
    } else {
      console.debug('You have administrative privileges; not replicating');
      this.globalActions.updateReplicationStatus({ disabled: true });
    }

    this.setupPromise = this.session.init();


    const dbFetch = (<any>window).PouchDB.fetch;
    (<any>window).PouchDB.fetch = function() {
      return dbFetch.apply(this, arguments)
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

    this.changes.register({
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

    this.changes.register({
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
          //Snackbar(`${change.id} changed`, {dev:true});
          this.showUpdateReady();
        }
      },
    });

    const userCtx = this.session.userCtx();
    this.changes.register({
      key: 'inbox-user-context',
      filter: (change) => {
        return (
          userCtx &&
          userCtx.name &&
          change.id === `org.couchdb.user:${userCtx.name}`
        );
      },
      callback: () => {
        this.session.init().then(refresh => refresh && this.showUpdateReady());
      },
    });

    this.changes.register({
      key: 'inbox-translations',
      filter: change => this.translationLoader.test(change.id),
      callback: change => this.translate.reloadLang(this.translationLoader.getCode(change.id)),
    });
  }

  private setAppTitle() {
    this.resourceIcons.getAppTitle().then(title => {
      document.title = title;
      (<any>window).$('.header-logo').attr('title', `${title}`);
    });
  }

  private showSessionExpired() {
    alert('session expired');
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
    Auth,
    Changes,
    CheckDate,
    CountMessages,
    DBSync,
    DatabaseConnectionMonitor,
    Debug,
    Feedback,
    GlobalActions,
    JsonForms,
    Language,
    LiveListConfig,
    Location,
    Modal,
    PrivacyPolicies,
    RecurringProcessManager,
    ResourceIcons,
    RulesEngine,
    Selectors,
    Session,
    SetLanguage,
    Snackbar,
    Telemetry,
    Tour,
    TranslateFrom,
    TranslationLoader,
    UnreadRecords,
    UpdateServiceWorker,
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

    ctrl.updateReplicationStatus({
      disabled: false,
      lastTrigger: undefined,
      lastSuccessTo: parseInt($window.localStorage.getItem('medic-last-replicated-date'))
    });

    DBSync.addUpdateListener(({ state, to, from }) => {
      if (state === 'disabled') {
        ctrl.updateReplicationStatus({ disabled: true });
        return;
      }
      if (state === 'unknown') {
        ctrl.updateReplicationStatus({ current: SYNC_STATUS.unknown });
        return;
      }
      const now = Date.now();
      const lastTrigger = ctrl.replicationStatus.lastTrigger;
      const delay = lastTrigger ? (now - lastTrigger) / 1000 : 'unknown';
      if (state === 'inProgress') {
        ctrl.updateReplicationStatus({
          current: SYNC_STATUS.inProgress,
          lastTrigger: now
        });
        $log.info(`Replication started after ${Math.round(delay)} seconds since previous attempt`);
        return;
      }
      const statusUpdates = {};
      if (to === 'success') {
        statusUpdates.lastSuccessTo = now;
      }
      if (from === 'success') {
        statusUpdates.lastSuccessFrom = now;
      }
      if (to === 'success' && from === 'success') {
        $log.info(`Replication succeeded after ${delay} seconds`);
        statusUpdates.current = SYNC_STATUS.success;
      } else {
        $log.info(`Replication failed after ${delay} seconds`);
        statusUpdates.current = SYNC_STATUS.required;
      }
      ctrl.updateReplicationStatus(statusUpdates);
    });

    // Set this first because if there are any bugs in configuration
    // we want to ensure dbsync still happens so they can be fixed
    // automatically.
    if (DBSync.isEnabled()) {
      // Delay it by 10 seconds so it doesn't slow down initial load.
      $timeout(() => DBSync.sync(), 10000);
    } else {
      $log.debug('You have administrative privileges; not replicating');
      ctrl.replicationStatus.disabled = true;
    }

    const dbFetch = $window.PouchDB.fetch;
    $window.PouchDB.fetch = function() {
      return dbFetch.apply(this, arguments)
        .then(function(response) {
          if (response.status === 401) {
            showSessionExpired();
            $timeout(() => {
              $log.info('Redirect to login after 1 minute of inactivity');
              Session.navigateToLogin();
            }, 60000);
          }
          return response;
        });
    };

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

    const setAppTitle = () => {
      ResourceIcons.getAppTitle().then(title => {
        document.title = title;
        $('.header-logo').attr('title', `${title}`);
      });
    };
    setAppTitle();

    Changes({
      key: 'branding-icon',
      filter: change => change.id === 'branding',
      callback: () => setAppTitle()
    });

    $window.addEventListener('online', () => DBSync.setOnlineStatus(true), false);
    $window.addEventListener('offline', () => DBSync.setOnlineStatus(false), false);
    Changes({
      key: 'sync-status',
      callback: function() {
        if (!DBSync.isSyncInProgress()) {
          ctrl.updateReplicationStatus({ current: SYNC_STATUS.required });
          DBSync.sync();
        }
      },
    });

    ctrl.dbWarmedUp = true;

    // initialisation tasks that can occur after the UI has been rendered
    ctrl.setupPromise = Session.init()
      .then(() => checkPrivacyPolicy())
      .then(() => initRulesEngine())
      .then(() => initForms())
      .then(() => initUnreadCount())
      .then(() => CheckDate())
      .then(() => startRecurringProcesses());

    Feedback.init();

    LiveListConfig();

    ctrl.setLoadingContent(false);
    ctrl.setLoadingSubActionBar(false);
    ctrl.adminUrl = Location.adminPath;
    ctrl.setIsAdmin(Session.isAdmin());
    ctrl.modalsToShow = [];

    if (
      $window.medicmobile_android &&
      typeof $window.medicmobile_android.getAppVersion === 'function'
    ) {
      ctrl.setAndroidAppVersion($window.medicmobile_android.getAppVersion());
    }

    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) {
          $log.info('Persistent storage granted: storage will not be cleared except by explicit user action');
        } else {
          $log.info('Persistent storage denied: storage may be cleared by the UA under storage pressure.');
        }
      });
    }

    ctrl.canLogOut = false;
    if (ctrl.androidAppVersion) {
      Auth.has('can_log_out_on_android').then(canLogout => ctrl.canLogOut = canLogout);
    } else {
      ctrl.canLogOut = true;
    }

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

    Changes({
      key: 'inbox-translations',
      filter: change => TranslationLoader.test(change.id),
      callback: change => $translate.refresh(TranslationLoader.getCode(change.id)),
    });

    Changes({
      key: 'inbox-ddoc',
      filter: function(change) {
        return (
          change.id === '_design/medic' ||
          change.id === '_design/medic-client' ||
          change.id === 'service-worker-meta' ||
          change.id === 'settings'
        );
      },
      callback: function(change) {
        if (change.id === 'service-worker-meta') {
          UpdateServiceWorker(showUpdateReady);
        } else {
          Snackbar(`${change.id} changed`, {dev:true});
          showUpdateReady();
        }
      },
    });

    const startRecurringProcesses = () => {
      RecurringProcessManager.startUpdateRelativeDate();
      if (Session.isOnlineOnly()) {
        RecurringProcessManager.startUpdateReadDocsCount();
      }
    };

    $scope.$on('$destroy', function() {
      unsubscribe();
      dbClosedDeregister();
      RecurringProcessManager.stopUpdateRelativeDate();
      RecurringProcessManager.stopUpdateReadDocsCount();
    });

    const userCtx = Session.userCtx();
    Changes({
      key: 'inbox-user-context',
      filter: function(change) {
        return (
          userCtx &&
          userCtx.name &&
          change.id === `org.couchdb.user:${userCtx.name}`
        );
      },
      callback: function() {
        Session.init().then(refresh => refresh && showUpdateReady());
      },
    });

    Auth.has('can_write_wealth_quintiles')
      .then(canWriteQuintiles => {
        if (canWriteQuintiles) {
          WealthQuintilesWatcher.start();
        }
      });
  });
})();*/
