const _ = require('underscore');
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
        setAndroidAppVersion: globalActions.setAndroidAppVersion,
        setCurrentTab: globalActions.setCurrentTab,
        setEnketoEditedStatus: globalActions.setEnketoEditedStatus,
        setFacilities: globalActions.setFacilities,
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
        icon: 'fa-question-circle',
        key: 'sync.status.unknown'
      }
    };

    ctrl.updateReplicationStatus({
      disabled: false,
      lastTrigger: undefined,
      current: SYNC_STATUS.unknown,
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
        ctrl.updateReplicationStatus({ current: SYNC_STATUS.inProgress });
        ctrl.updateReplicationStatus({ lastTrigger: now });
        $log.info(`Replication started after ${delay} seconds since previous attempt`);
        return;
      }
      if (to === 'success') {
        ctrl.updateReplicationStatus({ lastSuccessTo: now });
      }
      if (from === 'success') {
        ctrl.updateReplicationStatus({ lastSuccessFrom: now });
      }
      if (to === 'success' && from === 'success') {
        $log.info(`Replication succeeded after ${delay} seconds`);
        ctrl.updateReplicationStatus({ current: SYNC_STATUS.success });
      } else {
        $log.info(`Replication failed after ${delay} seconds`);
        ctrl.updateReplicationStatus({ current: SYNC_STATUS.required });
      }
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
            Session.navigateToLogin();
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
      .then(() => CheckDate());

    Feedback.init();

    LiveListConfig($scope);

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

    ctrl.canLogOut = false;
    if (ctrl.androidAppVersion) {
      Auth('can_log_out_on_android')
        .then(function() {
          ctrl.canLogOut = true;
        })
        .catch(function() {}); // not permitted to log out
    } else {
      ctrl.canLogOut = true;
    }
    $scope.logout = function() {
      Modal({
        templateUrl: 'templates/modals/logout_confirm.html',
        controller: 'LogoutConfirmCtrl',
        controllerAs: 'logoutConfirmCtrl',
        singleton: true,
      });
    };

    $scope.isMobile = function() {
      return $('#mobile-detection').css('display') === 'inline';
    };

    $scope.$on('HideContent', function() {
      $timeout(function() {
        if (ctrl.cancelCallback) {
          $scope.navigationCancel();
        } else {
          ctrl.navigateBack();
        }
      });
    });

    $transitions.onBefore({}, (trans) => {
      if (ctrl.enketoEdited && ctrl.cancelCallback) {
        $scope.navigationCancel({ to: trans.to(), params: trans.params() });
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

    // User wants to cancel current flow, or pressed back button, etc.
    $scope.navigationCancel = function(trans) {
      if (ctrl.enketoSaving) {
        // wait for save to finish
        return;
      }
      if (!ctrl.enketoEdited) {
        // form hasn't been modified - return immediately
        if (ctrl.cancelCallback) {
          ctrl.cancelCallback();
        }
        return;
      }
      // otherwise data will be discarded so confirm navigation
      Modal({
        templateUrl: 'templates/modals/navigation_confirm.html',
        controller: 'NavigationConfirmCtrl',
        controllerAs: 'navigationConfirmCtrl',
        singleton: true,
      }).then(function() {
        ctrl.setEnketoEditedStatus(false);
        if (trans) {
          return $state.go(trans.to, trans.params);
        }
        if (ctrl.cancelCallback) {
          ctrl.cancelCallback();
        }
      });
    };

    $transitions.onSuccess({}, function(trans) {
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
        ctrl.unreadCount = data;
      });
    };

    /**
     * Translates using the key if truthy using the old style label
     * array as a fallback.
     */
    var translateTitle = function(key, label) {
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
          var jsonFormSummaries = jsonForms.map(function(jsonForm) {
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
              var xFormSummaries = xForms.map(function(xForm) {
                return {
                  code: xForm.internalId,
                  title: translateTitle(xForm.translation_key, xForm.title),
                  icon: xForm.icon,
                };
              });
              const forms = xFormSummaries.concat(jsonFormSummaries);
              $scope.forms = forms;
              ctrl.setForms(forms);
              $rootScope.$broadcast('formLoadingComplete');
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
        .catch(function(err) {
          $rootScope.$broadcast('formLoadingComplete');
          $log.error('Failed to retrieve forms', err);
        });
    };

    const initTours = () => {
      return Tour.getTours().then(function(tours) {
        ctrl.tours = tours;
      });
    };

    $scope.openTourSelect = function() {
      return Modal({
        templateUrl: 'templates/modals/tour_select.html',
        controller: 'TourSelectCtrl',
        controllerAs: 'tourSelectCtrl',
        singleton: true,
      }).catch(function() {}); // modal dismissed is ok
    };

    $scope.openGuidedSetup = function() {
      return Modal({
        templateUrl: 'templates/modals/guided_setup.html',
        controller: 'GuidedSetupModalCtrl',
        controllerAs: 'guidedSetupModalCtrl',
        size: 'lg',
      }).catch(function() {}); // modal dismissed is ok
    };

    var startupModals = [
      // select language
      {
        required: function(settings, user) {
          return !user.language;
        },
        render: function() {
          return Modal({
            templateUrl: 'templates/modals/user_language.html',
            controller: 'UserLanguageModalCtrl',
            controllerAs: 'userLanguageModalCtrl'
          }).catch(function() {});
        },
      },
      // welcome screen
      {
        required: function(settings) {
          return !settings.setup_complete;
        },
        render: function() {
          return Modal({
            templateUrl: 'templates/modals/welcome.html',
            controller: 'WelcomeModalCtrl',
            controllerAs: 'welcomeModalCtrl',
            size: 'lg',
          }).catch(function() {});
        },
      },
      // guided setup
      {
        required: function(settings) {
          return !settings.setup_complete;
        },
        render: function() {
          return $scope
            .openGuidedSetup()
            .then(function() {
              return UpdateSettings({ setup_complete: true });
            })
            .catch(function(err) {
              $log.error('Error marking setup_complete', err);
            });
        },
      },
      // tour
      {
        required: function(settings, user) {
          return !user.known;
        },
        render: function() {
          return $scope
            .openTourSelect()
            .then(function() {
              return UpdateUser(Session.userCtx().name, { known: true });
            })
            .catch(function(err) {
              $log.error('Error updating user', err);
            });
        },
      },
    ];

    $q.all([Settings(), UserSettings()])
      .then(function(results) {
        var filteredModals = _.filter(startupModals, function(modal) {
          return modal.required(results[0], results[1]);
        });
        var showModals = function() {
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
      var target = $(event.target).closest('.send-message');
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

    $scope.emit = function() {
      $rootScope.$broadcast.apply($rootScope, arguments);
    };

    $scope.deleteDoc = function(doc) {
      Modal({
        templateUrl: 'templates/modals/delete_doc_confirm.html',
        controller: 'DeleteDocConfirm',
        controllerAs: 'deleteDocConfirmCtrl',
        model: { doc: doc },
      }).then(function() {
        if (
          !ctrl.selectMode &&
          ($state.includes('contacts') || $state.includes('reports'))
        ) {
          $state.go($state.current.name, { id: null });
        }
      });
    };

    $scope.bulkDelete = function(docs) {
      if (!docs) {
        $log.warn('Trying to delete empty object', docs);
        return;
      }
      if (!docs.length) {
        $log.warn('Trying to delete empty array', docs);
        return;
      }
      Modal({
        templateUrl: 'templates/modals/bulk_delete_confirm.html',
        controller: 'BulkDeleteConfirm',
        controllerAs: 'bulkDeleteConfirmCtrl',
        model: { docs: docs },
      });
    };

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
      var elem = $(e.target).closest('.message-body');
      if (!elem.is('.selected')) {
        $('#message-content .selected').removeClass('selected');
        elem.addClass('selected');
      }
    });

    $scope.openFeedback = function() {
      Modal({
        templateUrl: 'templates/modals/feedback.html',
        controller: 'FeedbackCtrl',
        controllerAs: 'feedbackCtrl'
      });
    };

    $scope.replicate = function() {
      DBSync.sync(true);
    };

    CountMessages.init();

    // close select2 dropdowns in the background
    var closeDropdowns = function() {
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
        singleton: true,
      });
      closeDropdowns();
    });
    DatabaseConnectionMonitor.listenForDatabaseClosed();

    var showUpdateReady = function() {
      Modal({
        templateUrl: 'templates/modals/version_update.html',
        controller: 'ReloadingModalCtrl',
        controllerAs: 'reloadingModalCtrl',
        singleton: true,
      }).catch(function() {
        $log.debug('Delaying update');
        $timeout(function() {
          $log.debug('Displaying delayed update ready dialog');
          showUpdateReady();
        }, 2 * 60 * 60 * 1000);
      });
      closeDropdowns();
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
          showUpdateReady();
        }
      },
    });

    RecurringProcessManager.startUpdateRelativeDate();
    if (Session.isOnlineOnly()) {
      RecurringProcessManager.startUpdateReadDocsCount();
    }
    $scope.$on('$destroy', function() {
      unsubscribe();
      dbClosedDeregister();
      RecurringProcessManager.stopUpdateRelativeDate();
      RecurringProcessManager.stopUpdateReadDocsCount();
    });

    var userCtx = Session.userCtx();
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

    Auth('can_write_wealth_quintiles')
      .then(function() {
        WealthQuintilesWatcher.start();
      })
      .catch(function() {});
  });
})();
