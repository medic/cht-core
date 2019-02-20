var feedback = require('../modules/feedback'),
  _ = require('underscore'),
  bootstrapTranslator = require('./../bootstrapper/translator'),
  moment = require('moment');

const LAST_REPLICATED_SEQ_KEY = require('../bootstrapper/purger').LAST_REPLICATED_SEQ_KEY;

(function() {
  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl', function(
    $log,
    $q,
    $rootScope,
    $scope,
    $state,
    $stateParams,
    $timeout,
    $translate,
    $window,
    APP_CONFIG,
    Auth,
    Changes,
    CheckDate,
    ContactSchema,
    CountMessages,
    DB,
    DBSync,
    Debug,
    Enketo,
    PlaceHierarchy,
    JsonForms,
    Language,
    LiveList,
    LiveListConfig,
    Location,
    Modal,
    RulesEngine,
    Select2Search,
    SendMessage,
    Session,
    SetLanguage,
    Settings,
    Snackbar,
    Tour,
    TranslateFrom,
    UnreadRecords,
    UpdateSettings,
    UpdateUser,
    UserSettings,
    WealthQuintilesWatcher,
    XmlForms,
    RecurringProcessManager,
    DatabaseConnectionMonitor
  ) {
    'ngInject';

    Session.init();

    if (window.location.href.indexOf('localhost') !== -1) {
      Debug.set(Debug.get()); // Initialize with cookie
    } else {
      // Disable debug for everything but localhost
      Debug.set(false);
    }

    $scope.replicationStatus = {
      disabled: false,
      lastSuccess: {},
      current: 'unknown',
      textKey: 'sync.status.unknown',
    };
    var SYNC_ICON = {
      in_progress: 'fa-refresh',
      not_required: 'fa-check',
      required: 'fa-exclamation-triangle',
      unknown: 'fa-question-circle',
    };
    DBSync(function(update) {
      if (update.disabled) {
        $scope.replicationStatus.disabled = true;
        // admins have potentially too much data so bypass local pouch
        $log.debug('You have administrative privileges; not replicating');
        return;
      }

      var now = Date.now();
      if (update.status !== 'required') {
        var last = $scope.replicationStatus.lastSuccess[update.direction];
        $scope.replicationStatus.lastSuccess[update.direction] = now;
        var delay = last ? (now - last) / 1000 : 'unknown';
        $log.info(
          'Replicate ' +
            update.direction +
            ' server successful with ' +
            delay +
            ' seconds since the previous successful replication.'
        );
      }

      if (update.direction === 'to') {
        $scope.replicationStatus.current = update.status;
        $scope.replicationStatus.textKey = 'sync.status.' + update.status;
        $scope.replicationStatus.icon = SYNC_ICON[update.status];

        if (update.status === 'not_required') {
          $scope.replicationStatus.lastCompleted = now;
          return DB().info().then(dbInfo => {
            $window.localStorage.setItem(LAST_REPLICATED_SEQ_KEY, dbInfo.update_seq);
          });
        }
      }
    });

    // BootstrapTranslator is used because $translator.onReady has not fired
    $('.bootstrap-layer .status').html(bootstrapTranslator.translate('LOAD_RULES'));

    RulesEngine.init.catch(function() {}).then(function() {
      $scope.dbWarmedUp = true;
    });

    feedback.init({
      saveDoc: function(doc, callback) {
        DB()
          .post(doc)
          .then(function() {
            callback();
          })
          .catch(callback);
      },
      getUserCtx: function(callback) {
        callback(null, Session.userCtx());
      },
    });

    LiveListConfig($scope);
    CheckDate();

    $scope.loadingContent = false;
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
    $scope.enketoStatus = { saving: false };
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
        if ($scope.cancelCallback) {
          $scope.navigationCancel();
        } else {
          $scope.clearSelected();
        }
      });
    });

    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState){
      if (!$scope.enketoStatus.edited){
        if (toState.name.indexOf('reports') === -1 || toState.name.indexOf('contacts') === -1 || toState.name.indexOf('tasks') === -1 || toState.name.indexOf('messages.detail') === -1) {
          $scope.unsetSelected();
        }
        if (toState.name.indexOf('tasks.detail') === -1) {
          Enketo.unload($scope.form);
          $scope.unsetSelected();
        }
        if (toState.name.split('.')[0] !== fromState.name.split('.')[0]){
          $scope.$broadcast('ClearSelected');
        }

        return;
      }
      if ($scope.cancelCallback){
        event.preventDefault();
        $scope.navigationCancel();
      }
    });

    // User wants to cancel current flow, or pressed back button, etc.
    $scope.navigationCancel = function() {
      if ($scope.enketoStatus.saving) {
        // wait for save to finish
        return;
      }
      if (!$scope.enketoStatus.edited) {
        // form hasn't been modified - return immediately
        if ($scope.cancelCallback) {
          $scope.cancelCallback();
        }
        return;
      }
      // otherwise data will be discarded so confirm navigation
      Modal({
        templateUrl: 'templates/modals/navigation_confirm.html',
        controller: 'NavigationConfirmCtrl',
        singleton: true,
      }).then(function() {
        $scope.enketoStatus.edited = false;
        if ($scope.cancelCallback) {
          $scope.cancelCallback();
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
      if (showContent && $scope.selectMode) {
        // when in select mode we never show the RHS on mobile
        return;
      }
      $scope.showContent = showContent;
    };

    $scope.clearCancelTarget = function() {
      delete $scope.cancelCallback;
    };

    $scope.setCancelTarget = function(callback) {
      $scope.cancelCallback = callback;
    };

    $scope.setTitle = function(title) {
      $scope.title = title;
    };

    $scope.setLoadingContent = function(id) {
      $scope.loadingContent = id;
      $scope.setShowContent(true);
    };

    $scope.$on('$stateChangeSuccess', function(event, toState) {
      $scope.currentTab = toState.name.split('.')[0];
      if (!$state.includes('reports')) {
        $scope.selectMode = false;
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

    var findIdInContactHierarchy = function(id, hierarchy) {
      return _.find(hierarchy, function(entry) {
        return (
          entry.doc._id === id || findIdInContactHierarchy(id, entry.children)
        );
      });
    };

    Changes({
      key: 'inbox-facilities',
      filter: function(change) {
        var hierarchyTypes = ContactSchema.getPlaceTypes().filter(function(pt) {
          return pt !== 'clinic';
        });
        // check if new document is a contact
        return hierarchyTypes.indexOf(change.doc.type) !== -1;
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
          !$scope.selectMode &&
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
      $scope.selectMode = value;
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

    CountMessages.init();

    // close select2 dropdowns in the background
    var closeDropdowns = function() {
      $('select.select2-hidden-accessible').each(function() {
        // prevent errors being thrown if selectors have not been
        // initialised yet
        try {
          $(this).select2('close');
        } catch (e) {}
      });
    };

    // close all select2 menus on navigation
    // https://github.com/medic/medic-webapp/issues/2927
    $rootScope.$on('$stateChangeStart', closeDropdowns);

    $rootScope.$on('databaseClosedEvent', function () {
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
      filter: function(change) {
        return change.doc.type === 'translations';
      },
      callback: function(change) {
        $translate.refresh(change.doc.code);
      },
    });

    if (window.applicationCache) {
      window.applicationCache.addEventListener('updateready', showUpdateReady);
      window.applicationCache.addEventListener('error', function(err) {
        // TODO: once we trigger this work out what a 401 looks like and redirect
        //       to the login page
        $log.error('Application cache update error', err);
      });
      if (
        window.applicationCache.status === window.applicationCache.UPDATEREADY ||
        window.applicationCache.status === window.applicationCache.UNCACHED
      ) {
        showUpdateReady();
      }
      Changes({
        key: 'inbox-ddoc',
        filter: function(change) {
          return (
            change.id === '_design/medic' ||
            change.id === '_design/medic-client' ||
            change.id === 'appcache' ||
            change.id === 'settings'
          );
        },
        callback: function() {
          // if the manifest hasn't changed, prompt user to reload settings
          window.applicationCache.addEventListener('noupdate', showUpdateReady);
          // check if the manifest has changed. if it has, download and prompt
          try {
            window.applicationCache.update();
          } catch (e) {
            // chrome incognito mode active
            $log.error('Error updating the appcache.', e);
            showUpdateReady();
          }
        },
      });
    }

    RecurringProcessManager.startUpdateRelativeDate();
    $scope.$on('$destroy', function() {
      RecurringProcessManager.stopUpdateRelativeDate();
    });

    var userCtx = Session.userCtx();
    Changes({
      key: 'inbox-user-context',
      filter: function(change) {
        return (
          change.doc.type === 'user-settings' &&
          userCtx &&
          userCtx.name &&
          change.doc.name === userCtx.name
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
