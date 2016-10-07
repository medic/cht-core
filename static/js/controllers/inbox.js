var feedback = require('../modules/feedback'),
    _ = require('underscore'),
    moment = require('moment'),
    guidedSetup = require('../modules/guided-setup');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl',
    function (
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
      Changes,
      CheckDate,
      ContactSchema,
      CountMessages,
      DB,
      DBSync,
      Enketo,
      FacilityHierarchy,
      JsonForms,
      Language,
      Layout,
      LiveListConfig,
      Location,
      Modal,
      ReadMessages,
      RulesEngine,
      Select2Search,
      SendMessage,
      Session,
      SetLanguageCookie,
      Settings,
      Snackbar,
      Tour,
      TrafficStats,
      UpdateSettings,
      UpdateUser,
      UserSettings,
      XmlForms
    ) {
      'ngInject';

      Session.init();
      TrafficStats($scope);

      $scope.replicationStatus = {
        disabled: false,
        lastSuccess: { }
      };
      DBSync(function(status) {
        if (status.disabled) {
          $scope.replicationStatus.disabled = true;
          // admins have potentially too much data so bypass local pouch
          $log.debug('You have administrative privileges; not replicating');
          return;
        }
        var now = Date.now();
        var last = $scope.replicationStatus.lastSuccess[status.direction];
        $scope.replicationStatus.lastSuccess[status.direction] = now;
        var delay = last ? (now - last) / 1000 : 'unknown';
        $log.info('Replicate ' + status.direction + ' server successful with ' + delay + ' seconds since the previous successful replication.');
      });

      RulesEngine.init
        .then(function() {
          $scope.dbWarmedUp = true;
        })
        .catch(function() {
          $scope.dbWarmedUp = true;
        });

      feedback.init({
        saveDoc: function(doc, callback) {
          DB().post(doc)
            .then(function() {
              callback();
            })
            .catch(callback);
        },
        getUserCtx: function(callback) {
          callback(null, Session.userCtx());
        }
      });

      LiveListConfig($scope);
      CheckDate();

      $scope.loadingContent = false;
      $scope.error = false;
      $scope.errorSyntax = false;
      $scope.appending = false;
      $scope.languages = [];
      $scope.facilities = [];
      $scope.people = [];
      $scope.filterQuery = { value: undefined };
      $scope.version = APP_CONFIG.version;
      $scope.actionBar = {};
      $scope.tours = [];
      $scope.baseUrl = Location.path;

      if ($window.medicmobile_android) {
        $scope.android_app_version = $window.medicmobile_android.getAppVersion();
      }

      $scope.logout = function() {
        Session.logout();
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
        if ($scope.cancelCallback) {
          $scope.navigationCancel();
        } else {
          $scope.clearSelected();
        }
        $scope.$apply();
      });

      // User wants to cancel current flow, or pressed back button, etc.
      $scope.navigationCancel = function() {
        Modal({
          templateUrl: 'templates/modals/navigation_confirm.html',
          controller: 'NavigationConfirmCtrl'
        })
        .then(function() {
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
        Layout.setTitle($scope);
        $scope.$broadcast('ClearSelected');
      };

      /**
       * Clear the selected item - may update the URL
       */
      $scope.clearSelected = function() {
        if ($stateParams.id) {
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

      $scope.setLoadingContent = function(id) {
        $scope.loadingContent = id;
        $scope.setShowContent(true);
      };

      $scope.isRead = function(message) {
        return _.contains(message.read, Session.userCtx().name);
      };

      $scope.readStatus = { forms: 0, messages: 0 };

      $scope.$on('$stateChangeSuccess', function(event, toState) {
        $scope.currentTab = toState.name.split('.')[0];
        if (!$state.includes('reports')) {
          $scope.selectMode = false;
        }
      });

      var updateAvailableFacilities = function() {
        FacilityHierarchy()
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
          return entry.doc._id === id ||
            findIdInContactHierarchy(id, entry.children);
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
        callback: updateAvailableFacilities
      });

      $scope.updateReadStatus = function() {
        ReadMessages(function(err, data) {
          if (err) {
            return $log.error('Error fetching read status', err);
          }
          $scope.readStatus = data;
        });
      };
      Changes({
        key: 'inbox-read-status',
        filter: function(change) {
          return change.doc.type === 'data_record';
        },
        callback: $scope.updateReadStatus
      });

      // get the forms for the forms filter
      JsonForms()
        .then(function(jsonForms) {
          XmlForms('FormsFilter', { contactForms: false, ignoreContext: true }, function(err, xForms) {
            if (err) {
              return $log.error('Error fetching form definitions', err);
            }
            var xFormSummaries = xForms.map(function(xForm) {
              return {
                code: xForm.internalId,
                name: xForm.title
              };
            });
            $scope.forms = xFormSummaries.concat(jsonForms);
            $rootScope.$broadcast('formLoadingComplete');
          });
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
        JsonForms()
          .then(function(jsonForms) {
            $scope.nonContactForms = xForms.concat(jsonForms);
          });
      });

      $scope.showMedicReporter = function(jsonformCode) {
        Modal({
          templateUrl: 'templates/modals/medic_reporter.html',
          controller: 'MedicReporterModalCtrl',
          model: { formCode: jsonformCode }
        });
      };

      // TODO when all modals are converted to on-demand modals, remove all these setup functions.
      $scope.setupGuidedSetup = function() {
        guidedSetup.init(Settings, UpdateSettings, $translate.instant);
        modalsInited.guidedSetup = true;
        showModals();
      };

      $scope.setupWelcome = function() {
        modalsInited.welcome = true;
        showModals();
      };

      var setupUserLanguage = function() {
        modalsInited.userLanguage = true;
        showModals();
      };

      Tour.getTours().then(function(tours) {
        $scope.tours = tours;
      });

      $scope.openTourSelect = function() {
        Modal({
          templateUrl: 'templates/modals/tour_select.html',
          controller: 'TourSelectCtrl'
        });
      };

      var startupModals = [
        // select language
        {
          required: function(settings, user) {
            return !user.language;
          },
          render: function(callback) {
            Modal({
              templateUrl: 'templates/modals/user_language.html',
              controller: 'UserLanguageModalCtrl'
            })
              .then(function() {
                callback();
              })
              .catch(function() {
                callback();
              });
          }
        },
        // welcome screen
        {
          required: function(settings) {
            return !settings.setup_complete;
          },
          render: function(callback) {
            $('#welcome').modal('show');
            $('#welcome').on('hide.bs.modal', callback);
          }
        },
        // guided setup
        {
          required: function(settings) {
            return !settings.setup_complete;
          },
          render: function(callback) {
            $('#guided-setup').modal('show');
            $('#guided-setup').on('hide.bs.modal', callback);
            UpdateSettings({ setup_complete: true })
              .catch(function(err) {
                $log.error('Error marking setup_complete', err);
              });
          }
        },
        // tour
        {
          required: function(settings, user) {
            return !user.known;
          },
          render: function() {
            $scope.openTourSelect();
            var id = 'org.couchdb.user:' + Session.userCtx().name;
            UpdateUser(id, { known: true })
              .catch(function(err) {
                $log.error('Error updating user', err);
              });
          }
        },
      ];

      var filteredModals;
      var modalsInited = {
        guidedSetup: false,
        welcome: false,
        userLanguage: false
      };

      var showModals = function() {
        if (filteredModals && _.every(_.values(modalsInited))) {
          // render the first modal and recursively show the rest
          if (filteredModals.length) {
            filteredModals.shift().render(function() {
              showModals(filteredModals);
            });
          }
        }
      };

      DB()
        .query('medic-client/doc_by_type', { key: [ 'translations', true ] })
        .then(function(result) {
          $scope.enabledLocales = _.pluck(result.rows, 'value');
        });

      $q.all([ Settings(), UserSettings() ])
        .then(function(results) {
          filteredModals = _.filter(startupModals, function(modal) {
            return modal.required(results[0], results[1]);
          });
          showModals();
        })
        .catch(function(err) {
          $log.error('Error fetching settings', err);
        });

      moment.locale(['en']);

      Language()
        .then(function(language) {
          moment.locale([language, 'en']);
          $translate.use(language);
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
            to: target.attr('data-send-to')
          }
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

      $scope.deleteDoc = function(docs) {
        if (!docs) {
          return;
        }
        if (!_.isArray(docs)) {
          docs = [ docs ];
        }
        if (!docs.length) {
          return;
        }
        Modal({
          templateUrl: 'templates/modals/delete_doc_confirm.html',
          controller: 'DeleteDocConfirm',
          model: { docs: docs }
        }).then(function() {
          if ($state.includes('contacts') || $state.includes('reports')) {
            if ($scope.selectMode) {
              $scope.clearSelected();
            } else {
              $state.go($state.current.name, { id: null });
            }
          }
        });
      };

      $scope.setSelectMode = function(value) {
        $scope.selectMode = value;
        $scope.clearSelected();
        $state.go('reports.detail', { id: null });
      };

      $('body').on('mouseenter', '.relative-date, .autoreply', function() {
        if ($(this).data('tooltipLoaded') !== true) {
          $(this).data('tooltipLoaded', true)
            .tooltip({
              placement: 'bottom',
              trigger: 'manual',
              container: $(this).closest('.inbox-items, .item-content')
            })
            .tooltip('show');
        }
      });
      $('body').on('mouseleave', '.relative-date, .autoreply', function() {
        if ($(this).data('tooltipLoaded') === true) {
          $(this).data('tooltipLoaded', false)
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
          controller: 'FeedbackCtrl'
        });
      };

      $scope.configurationPages = [
        {
          state: 'configuration.settings.basic',
          icon: 'fa-wrench',
          name: 'Settings',
          active: function() {
            return $state.includes('configuration.settings');
          }
        },
        {
          state: 'configuration.translation.languages',
          icon: 'fa-language',
          name: 'Languages',
          active: function() {
            return $state.includes('configuration.translation');
          }
        },
        {
          state: 'configuration.forms',
          icon: 'fa-list-alt',
          name: 'Forms',
          active: function() {
            return $state.is('configuration.forms');
          }
        },
        {
          state: 'configuration.export.messages',
          icon: 'fa-exchange fa-rotate-90',
          name: 'import.export',
          active: function() {
            return $state.includes('configuration.export');
          }
        },
        {
          state: 'configuration.user',
          icon: 'fa-user',
          name: 'edit.user.settings',
          active: function() {
            return $state.is('configuration.user');
          }
        },
        {
          state: 'configuration.users',
          icon: 'fa-users',
          name: 'Users',
          active: function() {
            return $state.is('configuration.users');
          }
        },
        {
          state: 'configuration.icons',
          icon: 'fa-file-image-o',
          name: 'icons',
          active: function() {
            return $state.is('configuration.icons');
          }
        },
        {
          state: 'configuration.targets',
          icon: 'fa-dot-circle-o',
          name: 'analytics.targets',
          active: function() {
            return $state.is('configuration.targets') || $state.is('configuration.targets-edit');
          }
        },
        {
          state: 'configuration.permissions',
          icon: 'fa-key',
          name: 'configuration.permissions',
          active: function() {
            return $state.is('configuration.permissions');
          }
        },
      ];

      CountMessages.init();
      setupUserLanguage();

      var showUpdateReady = function() {
        Modal({
          templateUrl: 'templates/modals/version_update.html',
          controller: 'VersionUpdateCtrl'
        })
        .catch(function() {
          $log.debug('Delaying update');
          $timeout(function() {
            $log.debug('Displaying delayed update ready dialog');
            showUpdateReady();
          }, 2 * 60 * 60 * 1000);
        });

        // close select2 dropdowns in the background
        $('select.select2-hidden-accessible').each(function(i, e) {
          // prevent errors being thrown if selectors have not been
          // initialised before the update dialog is to be shown
          try { $(e).select2('close'); } catch(e) {}
        });
      };

      Changes({
        key: 'inbox-translations',
        filter: function(change) {
          return change.doc.type === 'translations';
        },
        callback: function(change) {
          $translate.refresh(change.doc.code);
        }
      });

      if (window.applicationCache) {
        window.applicationCache.addEventListener('updateready', showUpdateReady);
        window.applicationCache.addEventListener('error', function(err) {
          // TODO: once we trigger this work out what a 401 looks like and redirect
          //       to the login page
          $log.error('Application cache update error', err);
        });
        if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
          showUpdateReady();
        }
        Changes({
          key: 'inbox-ddoc',
          filter: function(change) {
            return change.id === '_design/medic' ||
                   change.id === '_design/medic-client' ||
                   change.id === 'appcache';
          },
          callback: function() {
            // if the manifest hasn't changed, prompt user to reload settings
            window.applicationCache.addEventListener('noupdate', showUpdateReady);
            // check if the manifest has changed. if it has, download and prompt
            try {
              window.applicationCache.update();
            } catch(e) {
              // chrome incognito mode active
              $log.error('Error updating the appcache.', e);
              showUpdateReady();
            }
          }
        });
      }

    }
  );

}());
