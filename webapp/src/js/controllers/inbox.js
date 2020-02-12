const _ = require('lodash/core');
_.uniq = require('lodash/uniq');
_.groupBy = require('lodash/groupBy');
_.uniqBy = require('lodash/uniqBy');
_.findIndex = require('lodash/findIndex');
_.minBy = require('lodash/minBy');
_.partial = require('lodash/partial');
_.partial.placeholder = _;
_.range = require('lodash/range');
_.intersection = require('lodash/intersection');
_.toPairs = require('lodash/toPairs');
_.difference = require('lodash/difference');
_.template = require('lodash/template');
_.templateSettings = require('lodash/templateSettings');
_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;
const moment = require('moment');

(function() {
  'use strict';

  angular.module('inboxControllers', []);

  angular.module('inboxControllers').controller('InboxCtrl', function(
    $log,
    $ngRedux,
    $q,
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
    RecurringProcessManager,
    ResourceIcons,
    RulesEngine,
    Selectors,
    Session,
    SetLanguage,
    Settings,
    Snackbar,
    Telemetry,
    Tour,
    TranslateFrom,
    TranslationLoader,
    UnreadRecords,
    UpdateServiceWorker,
    UpdateSettings,
    UpdateUser,
    UserSettings,
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
        replicationStatus: Selectors.getReplicationStatus(state),
        selectMode: Selectors.getSelectMode(state),
        showContent: Selectors.getShowContent(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      return {
        navigateBack: globalActions.navigateBack,
        navigationCancel: globalActions.navigationCancel,
        openGuidedSetup: globalActions.openGuidedSetup,
        openTourSelect: globalActions.openTourSelect,
        setAndroidAppVersion: globalActions.setAndroidAppVersion,
        setCurrentTab: globalActions.setCurrentTab,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setForms: globalActions.setForms,
        setIsAdmin: globalActions.setIsAdmin,
        setLoadingContent: globalActions.setLoadingContent,
        setLoadingSubActionBar: globalActions.setLoadingSubActionBar,
        setSelectMode: globalActions.setSelectMode,
        setShowActionBar: globalActions.setShowActionBar,
        setShowContent: globalActions.setShowContent,
        setTitle: globalActions.setTitle,
        setUnreadCount: globalActions.setUnreadCount,
        unsetSelected: globalActions.unsetSelected,
        updateReplicationStatus: globalActions.updateReplicationStatus
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
    Session.init()
      .then(() => initRulesEngine())
      .then(() => initForms())
      .then(() => initTours())
      .then(() => initUnreadCount())
      .then(() => CheckDate())
      .then(() => startRecurringProcesses());

    Feedback.init();

    LiveListConfig();

    ctrl.setLoadingContent(false);
    ctrl.setLoadingSubActionBar(false);
    ctrl.tours = [];
    ctrl.adminUrl = Location.adminPath;
    ctrl.setIsAdmin(Session.isAdmin());

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

    /**
     * Translates using the key if truthy using the old style label
     * array as a fallback.
     */
    const translateTitle = function(key, label) {
      return key ? $translate.instant(key) : TranslateFrom(label);
    };

    const initRulesEngine = () => RulesEngine.isEnabled()
      .then(isEnabled => $log.info(`RulesEngine Status: ${isEnabled ? 'Enabled' : 'Disabled'}`))
      .catch(err => $log.error('RuleEngine failed to initialize', err));

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

    const initTours = () => {
      return Tour.getTours().then(function(tours) {
        ctrl.tours = tours;
      });
    };

    const startupModals = [
      // welcome screen
      {
        required: settings => !settings.setup_complete,
        render: () => {
          return Modal({
            templateUrl: 'templates/modals/welcome.html',
            controller: 'WelcomeModalCtrl',
            controllerAs: 'welcomeModalCtrl',
            size: 'lg',
          }).catch(() => {});
        },
      },
      // guided setup
      {
        required: settings => !settings.setup_complete,
        render: () => {
          return ctrl.openGuidedSetup()
            .then(() => UpdateSettings({ setup_complete: true }))
            .catch(err => $log.error('Error marking setup_complete', err));
        },
      },
      // tour
      {
        required: (settings, user) => !user.known,
        render: () => {
          return ctrl.openTourSelect()
            .then(() => UpdateUser(Session.userCtx().name, { known: true }))
            .catch(err => $log.error('Error updating user', err));
        },
      },
    ];

    $q.all([Settings(), UserSettings()])
      .then(function(results) {
        const filteredModals = _.filter(startupModals, function(modal) {
          return modal.required(results[0], results[1]);
        });
        const showModals = function() {
          if (filteredModals && filteredModals.length) {
            // render the first modal and recursively show the rest
            filteredModals
              .shift()
              .render()
              .then(showModals);
          }
        };
        showModals();
      })
      .catch(function(err) {
        $log.error('Error fetching settings', err);
      });

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
        Session.init().then(() => showUpdateReady());
      },
    });

    Auth.has('can_write_wealth_quintiles')
      .then(canWriteQuintiles => {
        if (canWriteQuintiles) {
          WealthQuintilesWatcher.start();
        }
      });
  });
})();
