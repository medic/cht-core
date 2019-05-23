var _ = require('underscore'),
  bootstrapTranslator = require('./../bootstrapper/translator'),
  moment = require('moment');

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
    $stateParams,
    $timeout,
    $transitions,
    $translate,
    $window,
    APP_CONFIG,
    Actions,
    Auth,
    Changes,
    CheckDate,
    ContactSchema,
    CountMessages,
    DBSync,
    DatabaseConnectionMonitor,
    Debug,
    Enketo,
    Feedback,
    JsonForms,
    Language,
    LiveListConfig,
    Location,
    Modal,
    PlaceHierarchy,
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

    var ctrl = this;
    var mapStateToTarget = function(state) {
      return {
        cancelCallback: Selectors.getCancelCallback(state),
        enketoEdited: Selectors.getEnketoEditedStatus(state),
        enketoSaving: Selectors.getEnketoSavingStatus(state),
        selectMode: Selectors.getSelectMode(state)
      };
    };
    var mapDispatchToTarget = function(dispatch) {
      var actions = Actions(dispatch);
      return {
        setEnketoEditedStatus: actions.setEnketoEditedStatus,
        setSelectMode: actions.setSelectMode
      };
    };
    var unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    Session.init();

    if ($window.location.href.indexOf('localhost') !== -1) {
      Debug.set(Debug.get()); // Initialize with cookie
    } else {
      // Disable debug for everything but localhost
      Debug.set(false);
    }

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

    $scope.replicationStatus = {
      disabled: false,
      lastSuccess: {},
      lastTrigger: undefined,
      current: SYNC_STATUS.unknown,
    };

    DBSync.addUpdateListener(({ state, to, from }) => {
      if (state === 'disabled') {
        $scope.replicationStatus.disabled = true;
        return;
      }
      if (state === 'unknown') {
        $scope.replicationStatus.current = SYNC_STATUS.unknown;
        return;
      }
      const now = Date.now();
      const lastTrigger = $scope.replicationStatus.lastTrigger;
      const delay = lastTrigger ? (now - lastTrigger) / 1000 : 'unknown';
      if (state === 'inProgress') {
        $scope.replicationStatus.current = SYNC_STATUS.inProgress;
        $scope.replicationStatus.lastTrigger = now;
        $log.info(`Replication started after ${delay} seconds since previous attempt`);
        return;
      }
      if (to === 'success') {
        $scope.replicationStatus.lastSuccess.to = now;
      }
      if (from === 'success') {
        $scope.replicationStatus.lastSuccess.from = now;
      }
      if (to === 'success' && from === 'success') {
        $log.info(`Replication succeeded after ${delay} seconds`);
        $scope.replicationStatus.current = SYNC_STATUS.success;
      } else {
        $log.info(`Replication failed after ${delay} seconds`);
        $scope.replicationStatus.current = SYNC_STATUS.required;
      }
    });

    const setAppTitle = () => {
      ResourceIcons.getAppTitle().then(title => {
        document.title = title;
        $('.header-logo').attr('title', `${title} | ${APP_CONFIG.version}`);
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
          $scope.replicationStatus.current = SYNC_STATUS.required;
        }
      },
    });
    DBSync.sync();

    // BootstrapTranslator is used because $translator.onReady has not fired
    $('.bootstrap-layer .status').html(bootstrapTranslator.translate('LOAD_RULES'));

    RulesEngine.init.catch(function() {}).then(function() {
      $scope.dbWarmedUp = true;

      var dbWarmed = performance.now();
      Telemetry.record(
        'boot_time:4:to_db_warmed',
        dbWarmed - $window.startupTimes.bootstrapped
      );
      Telemetry.record('boot_time', dbWarmed - $window.startupTimes.start);

      delete $window.startupTimes;
    });

    Feedback.init();

    LiveListConfig($scope);
    CheckDate();

    $scope.loadingContent = false;
    $scope.loadingSubActionBar = false;
    $scope.error = false;
    $scope.errorSyntax = false;
    $scope.appending = false;
    $scope.facilities = [];
    $scope.people = [];
    $scope.filterQuery = { value: null };
    $scope.version = APP_CONFIG.version;
    $scope.actionBar = {};
    $scope.tours = [];
    $scope.baseUrl = Location.path;
    $scope.adminUrl = Location.adminPath;
    $scope.isAdmin = Session.isAdmin();

    if (
      $window.medicmobile_android &&
      typeof $window.medicmobile_android.getAppVersion === 'function'
    ) {
      $scope.android_app_version = $window.medicmobile_android.getAppVersion();
    }

    $scope.canLogOut = false;
    if ($scope.android_app_version) {
      Auth('can_log_out_on_android')
        .then(function() {
          $scope.canLogOut = true;
        })
        .catch(function() {}); // not permitted to log out
    } else {
      $scope.canLogOut = true;
    }
    $scope.logout = function() {
      Modal({
        templateUrl: 'templates/modals/logout_confirm.html',
        controller: 'LogoutConfirmCtrl',
        singleton: true,
      });
    };

    $scope.isMobile = function() {
      return $('#mobile-detection').css('display') === 'inline';
    };

    $scope.setFilterQuery = function(query) {
      if (query) {
        $scope.filterQuery.value = query;
      }
    };

    $scope.$on('HideContent', function() {
      $timeout(function() {
        if (ctrl.cancelCallback) {
          $scope.navigationCancel();
        } else {
          $scope.clearSelected();
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
        $scope.unsetSelected();
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

    /**
     * Unset the selected item without navigation
     */
    $scope.unsetSelected = function() {
      $scope.setShowContent(false);
      $scope.loadingContent = false;
      $scope.showActionBar = false;
      $scope.setTitle();
      $scope.$broadcast('ClearSelected');
    };

    /**
     * Clear the selected item - may update the URL
     */
    $scope.clearSelected = function() {
      if ($state.current.name === 'contacts.deceased') {
        $state.go('contacts.detail', { id: $stateParams.id });
      } else if ($stateParams.id) {
        $state.go($state.current.name, { id: null });
      } else {
        $scope.unsetSelected();
      }
    };

    $scope.settingSelected = function(refreshing) {
      $scope.loadingContent = false;
      $timeout(function() {
        $scope.setShowContent(true);
        $scope.showActionBar = true;
        if (!refreshing) {
          $timeout(function() {
            $('.item-body').scrollTop(0);
          });
        }
      });
    };

    $scope.setShowContent = function(showContent) {
      if (showContent && ctrl.selectMode) {
        // when in select mode we never show the RHS on mobile
        return;
      }
      $scope.showContent = showContent;
    };

    $scope.setTitle = function(title) {
      $scope.title = title;
    };

    $scope.setLoadingContent = function(id) {
      $scope.loadingContent = id;
      $scope.setShowContent(true);
    };

    $scope.setLoadingSubActionBar = function(loadingSubActionBar) {
      $scope.loadingSubActionBar = loadingSubActionBar;
    };

    $transitions.onSuccess({}, function(trans) {
      $scope.currentTab = trans.to().name.split('.')[0];
      if (!$state.includes('reports')) {
        ctrl.setSelectMode(false);
      }
    });

    var updateAvailableFacilities = function() {
      PlaceHierarchy()
        .then(function(hierarchy) {
          $scope.facilities = hierarchy;
        })
        .catch(function(err) {
          $log.error('Error loading facilities', err);
        });
    };
    updateAvailableFacilities();

    Changes({
      key: 'inbox-facilities',
      filter: function(change) {
        var hierarchyTypes = ContactSchema.getPlaceTypes().filter(function(pt) {
          return pt !== 'clinic';
        });
        // check if new document is a contact
        return change.doc && hierarchyTypes.indexOf(change.doc.type) !== -1;
      },
      callback: updateAvailableFacilities,
    });

    $scope.unreadCount = {};
    UnreadRecords(function(err, data) {
      if (err) {
        return $log.error('Error fetching read status', err);
      }
      $scope.unreadCount = data;
    });

    /**
     * Translates using the key if truthy using the old style label
     * array as a fallback.
     */
    var translateTitle = function(key, label) {
      return key ? $translate.instant(key) : TranslateFrom(label);
    };

    // get the forms for the forms filter
    $translate.onReady(function() {
      JsonForms()
        .then(function(jsonForms) {
          var jsonFormSummaries = jsonForms.map(function(jsonForm) {
            return {
              code: jsonForm.code,
              title: translateTitle(jsonForm.translation_key, jsonForm.name),
              icon: jsonForm.icon,
            };
          });
          XmlForms(
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
              $scope.forms = xFormSummaries.concat(jsonFormSummaries);
              $rootScope.$broadcast('formLoadingComplete');
            }
          );
        })
        .catch(function(err) {
          $rootScope.$broadcast('formLoadingComplete');
          $log.error('Failed to retrieve forms', err);
        });

      // get the forms for the Add Report menu
      XmlForms('AddReportMenu', { contactForms: false }, function(err, xForms) {
        if (err) {
          return $log.error('Error fetching form definitions', err);
        }
        Enketo.clearXmlCache();
        $scope.nonContactForms = xForms.map(function(xForm) {
          return {
            code: xForm.internalId,
            icon: xForm.icon,
            title: translateTitle(xForm.translation_key, xForm.title),
          };
        });
      });
    });

    Tour.getTours().then(function(tours) {
      $scope.tours = tours;
    });

    $scope.openTourSelect = function() {
      return Modal({
        templateUrl: 'templates/modals/tour_select.html',
        controller: 'TourSelectCtrl',
        singleton: true,
      }).catch(function() {}); // modal dismissed is ok
    };

    $scope.openGuidedSetup = function() {
      return Modal({
        templateUrl: 'templates/modals/guided_setup.html',
        controller: 'GuidedSetupModalCtrl',
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
        model: {
          to: target.attr('data-send-to'),
        },
      });
    });

    $scope.setSubActionBarStatus = function(verified) {
      $scope.actionBar.right.verified = verified;
    };

    $scope.setRightActionBar = function(model) {
      if (!$scope.actionBar) {
        $scope.actionBar = {};
      }
      $scope.actionBar.right = model;
    };

    $scope.setLeftActionBar = function(model) {
      if (!$scope.actionBar) {
        $scope.actionBar = {};
      }
      $scope.actionBar.left = model;
    };

    $scope.setActionBar = function(model) {
      $scope.actionBar = model;
    };

    $scope.emit = function() {
      $rootScope.$broadcast.apply($rootScope, arguments);
    };

    $scope.deleteDoc = function(doc) {
      Modal({
        templateUrl: 'templates/modals/delete_doc_confirm.html',
        controller: 'DeleteDocConfirm',
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
        model: { docs: docs },
      });
    };

    $scope.setSelectMode = function(value) {
      ctrl.setSelectMode(value);
      $scope.clearSelected();
      $state.go('reports.detail', { id: null });
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
        singleton: true,
      });
      closeDropdowns();
    });
    DatabaseConnectionMonitor.listenForDatabaseClosed();

    var showUpdateReady = function() {
      Modal({
        templateUrl: 'templates/modals/version_update.html',
        controller: 'ReloadingModalCtrl',
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
        Session.init(showUpdateReady);
      },
    });

    Auth('can_write_wealth_quintiles')
      .then(function() {
        WealthQuintilesWatcher.start();
      })
      .catch(function() {});
  });
})();
