var feedback = require('../modules/feedback'),
    _ = require('underscore'),
    moment = require('moment'),
    sendMessage = require('../modules/send-message'),
    tour = require('../modules/tour'),
    modal = require('../modules/modal'),
    select2Ajax = require('../modules/select2-ajax'),
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
      $timeout,
      $translate,
      $window,
      APP_CONFIG,
      Auth,
      BaseUrlService,
      Changes,
      CheckDate,
      Contact,
      CountMessages,
      DB,
      DBSync,
      DeleteDoc,
      Enketo,
      Facility,
      FacilityHierarchy,
      JsonForms,
      Language,
      LiveListConfig,
      Modal,
      PLACE_TYPES,
      ReadMessages,
      RulesEngine,
      Search,
      SendMessage,
      SetLanguageCookie,
      Session,
      Settings,
      Snackbar,
      TrafficStats,
      UpdateSettings,
      UpdateUser,
      UserSettings,
      XmlForms
    ) {
      'ngInject';

      Session.init();

      TrafficStats($scope);

      $scope.initialReplication = {
        status: 'initial.replication.status.in_progress'
      };

      DBSync(function(err, result) {
        if (err) {
          $log.debug('Error initializing DB sync. Continuing anyway.', err);
        }
        $scope.initialReplication = result;
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
          DB.get().post(doc)
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
      CheckDate($scope);

      $scope.loadingContent = false;
      $scope.error = false;
      $scope.errorSyntax = false;
      $scope.appending = false;
      $scope.languages = [];
      $scope.forms = [];
      $scope.facilities = [];
      $scope.people = [];
      $scope.totalItems = undefined;
      $scope.filterQuery = { value: undefined };
      $scope.version = APP_CONFIG.version;
      $scope.actionBar = {};
      $scope.title = undefined;
      $scope.tours = [];

      $scope.baseUrl = BaseUrlService();

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

      /**
       * Close the highest-priority dropdown within a particular container.
       * @return {boolean} `true` if a dropdown was closed; `false` otherwise.
       */
      var closeDropdownsIn = function($container) {
        // If there are any select2 dropdowns open, close them.  The select
        // boxes are closed while they are checked - this saves us having to
        // iterate over them twice
        if(_.chain($container.find('select.select2-hidden-accessible'))
            .map(function(e) {
              e = $(e);
              if(e.select2('isOpen')) {
                e.select2('close');
                return true;
              }
            })
            .contains(true)
            .value()) {
          return true;
        }

        // If there is a dropdown menu open, close it
        var $dropdown = $container.find('.filter.dropdown.open:visible');
        if ($dropdown.length) {
          $dropdown.removeClass('open');
          return true;
        }

        // On an Enketo form, go to the previous page (if there is one)
        if ($container.find('.enketo .btn.previous-page:visible:enabled:not(".disabled")').length) {
          window.history.back();
          return true;
        }

        return false;
      };

      /**
       * Handle hardware back-button presses when inside the android app.
       * @return {boolean} `true` if angular handled the back button; otherwise
       *   the android app will handle it as it sees fit.
       */
      $scope.handleAndroidBack = function() {
        // If there's a modal open, close any dropdowns inside it, or try to
        // close the modal itself.
        var $modal = $('.modal:visible');
        if ($modal.length) {
          // find the modal with highest z-index, and ignore the rest
          var $topModal;
          $modal.each(function(i, next) {
            if (!$topModal) {
              $topModal = $(next);
              return;
            }
            var $next = $(next);
            if ($topModal.css('z-index') <= $next.css('z-index')) {
              $topModal = $next;
            }
          });

          if (!closeDropdownsIn($topModal)) {
            // Try to close by clicking modal's top-right `X` or `[ Cancel ]`
            // button.
            $topModal.find('.btn.cancel:visible:not(:disabled),' +
                'button.cancel.close:visible:not(:disabled)').click();
          }
          return true;
        }

        // If the hotdog hamburger options menu is open, close it
        var $optionsMenu = $('.dropdown.options.open');
        if($optionsMenu.length) {
          $optionsMenu.removeClass('open');
          return true;
        }

        // If there is an actionbar drop-up menu open, close it
        var $dropup = $('.actions.dropup.open:visible');
        if ($dropup.length) {
          $dropup.removeClass('open');
          return true;
        }

        if (closeDropdownsIn($('body'))) {
          return true;
        }

        // If viewing RHS content, do as the filter-bar X/< button does
        if ($scope.showContent) {
          if ($scope.cancelCallback) {
            $scope.navigationCancel();
          } else {
            $scope.closeContentPane();
          }
          $scope.$apply();
          return true;
        }

        // If we're viewing a help page, return to the about page
        if ($state.includes('help')) {
          $state.go('about');
          return true;
        }

        // If we're viewing a tab, but not the primary tab, go to primary tab
        var primaryState = $('#messages-tab:visible').length ? 'messages' : 'tasks';
        if (!$state.includes(primaryState)) {
          $state.go(primaryState);
          return true;
        }

        return false;
      };

      // User wants to cancel current flow, or pressed back button, etc.
      $scope.navigationCancel = function() {
        Modal({
          templateUrl: 'templates/modals/navigation_confirm.html',
          controller: 'ConfirmModalCtrl',
          args: { processingFunction: null }
        }).then(function () {
            if ($scope.cancelCallback) {
              $scope.cancelCallback();
            }
          }, function () {
            $log.debug('User cancelled navigationCancel.');
          });
      };

      $scope.closeContentPane = function() {
        $scope.clearSelected();
        $state.go($state.current.name, { id: null });
      };

      $scope.clearSelected = function() {
        $scope.showContent = false;
        $scope.loadingContent = false;
        $scope.showActionBar = false;
        $scope.setTitle();
        $scope.$broadcast('ClearSelected');
      };

      $scope.settingSelected = function(refreshing) {
        $scope.loadingContent = false;
        $timeout(function() {
          $scope.showContent = true;
          $scope.showActionBar = true;
          if (!refreshing) {
            $timeout(function() {
              $('.item-body').scrollTop(0);
            });
          }
        });
      };

      $scope.setShowContent = function(showContent) {
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
        $timeout(function() {
          $scope.showContent = true;
        });
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

      $scope.download = function() {
        $rootScope.$broadcast('export');
      };

      var updateAvailableFacilities = function() {
        FacilityHierarchy(function(err, hierarchy) {
          if (err) {
            return $log.error('Error loading facilities', err);
          }
          $scope.facilities = hierarchy;
        });
      };
      updateAvailableFacilities();

      var setupSelect2Ajax = function(selector) {
        $(selector).each(function(idx, el) {
          var module = select2Ajax.init($translate, Search, DB, $q);
          module($(el), 'person', { allowNew: false })
            .catch(function(err) {
              $log.error('Error initialising select2', err);
            });
        });
      };

      $scope.setupEditUser = function() {
        setupSelect2Ajax('#edit-user-profile [name=contact]');
      };

      $scope.setupEditReport = function() {
        setupSelect2Ajax('.edit-report-dialog [name=facility]');
      };

      $scope.setupUpdateFacility = function() {
        setupSelect2Ajax('.update-facility-dialog [name=facility]');
      };

      var findIdInContactHierarchy = function(id, hierarchy) {
        return _.find(hierarchy, function(entry) {
          return entry.doc._id === id ||
            findIdInContactHierarchy(id, entry.children);
        });
      };

      Changes({
        key: 'inbox-facilities',
        filter: function(change) {
          var hierarchyTypes = PLACE_TYPES.filter(function(pt) {
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

      $scope.setupSendMessage = function() {
        sendMessage.init(Settings, Contact, $translate.instant);
      };

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
          });
        })
        .catch(function(err) {
          $log.error('Failed to retrieve forms', err);
        });

      // get the forms for the Add Report menu
      XmlForms('AddReportMenu', { contactForms: false }, function(err, xForms) {
        if (err) {
          return $log.error('Error fetching form definitions', err);
        }
        Enketo.clearXmlCache();
        $scope.nonContactForms = xForms;
      });

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

      var startupModals = [
        // select language
        {
          required: function(settings, user) {
            return !user.language;
          },
          render: function(callback) {
            Modal({
              templateUrl: 'templates/modals/user_language.html',
              controller: 'UserLanguageModalCtrl',
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
            UpdateSettings({ setup_complete: true }, function(err) {
              if (err) {
                $log.error('Error marking setup_complete', err);
              }
            });
          }
        },
        // tour
        {
          required: function(settings, user) {
            return !user.known;
          },
          render: function() {
            tour.start('intro', $translate.instant);
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

      var editUserModel = {};

      $scope.editCurrentUserPrepare = function() {
        $rootScope.$broadcast('EditUserInit', editUserModel);
      };

      var updateEditUserModel = function(callback) {
        UserSettings(function(err, user) {
          if (err) {
            return $log.error('Error getting user', err);
          }
          editUserModel = {
            id: user._id,
            rev: user._rev,
            name: user.name,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            language: { code: user.language },
            contact_id: user.contact_id
          };
          if (callback) {
            callback(user);
          }
        });
      };

      Changes({
        key: 'inbox-user',
        filter: function(change) {
          return change.id === editUserModel.id;
        },
        callback: function() {
          updateEditUserModel();
        }
      });

      Settings()
        .then(function(settings) {
          $scope.enabledLocales = _.reject(settings.locales, function(locale) {
            return !!locale.disabled;
          });
          updateEditUserModel(function(user) {
            filteredModals = _.filter(startupModals, function(modal) {
              return modal.required(settings, user);
            });
            showModals();
          });
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

      $scope.sendMessage = function(event) {
        sendMessage.validate(event.target, function(recipients, message) {
          var pane = modal.start($(event.target).closest('.message-form'));
          SendMessage(recipients, message)
            .then(function() {
              $('#message-footer').removeClass('sending');
              $('#message-footer textarea').val('');
              pane.done();
            })
            .catch(function(err) {
              pane.done($translate.instant('Error sending message'), err);
            });
        });
      };

      $scope.setActionBar = function(model) {
        $scope.actionBar = model;
      };

      $scope.emit = function() {
        $rootScope.$broadcast.apply($rootScope, arguments);
      };

      $scope.deleteDoc = function(docs) {
        Modal({
          templateUrl: 'templates/modals/delete_doc_confirm.html',
          controller: 'ConfirmModalCtrl',
          args: {
            processingFunction: function() {
              if (!docs || !docs.length) {
                return $q.reject(new Error('Error deleting document: no doc selected'));
              }
              return DeleteDoc(docs);
            },
            model: { docs: docs }
          }
        })
        .then(function() {
          if ($state.includes('contacts') || $state.includes('reports')) {
            if ($scope.selectMode) {
              $scope.clearSelected();
            } else {
              $state.go($state.current.name, { id: null });
            }
          }
          var key = docs.length === 1 ? 'document.deleted' : 'document.deleted.plural';
          $translate(key, { number: docs.length }).then(Snackbar);
        })
        .catch(function(err) {
          $log.debug('User cancelled deleteDoc.', err);
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

      Auth('can_view_messages_tab').then(function() {
        $scope.tours.push({
          order: 1,
          id: 'messages',
          icon: 'fa-envelope',
          name: 'Messages'
        });
      });

      Auth('can_view_reports_tab').then(function() {
        $scope.tours.push({
          order: 2,
          id: 'reports',
          icon: 'fa-list-alt',
          name: 'Reports'
        });
      });

      $scope.setupTour = function() {
        $('#tour-select').on('click', 'a.tour-option', function() {
          $('#tour-select').modal('hide');
        });
      };

      $scope.prepareFeedback = function() {
        $('#feedback [name=feedback]').val('');
      };

      $scope.submitFeedback = function() {
        var pane = modal.start($('#feedback'));
        var message = $('#feedback [name=feedback]').val();
        feedback.submit(message, APP_CONFIG, function(err) {
          if (!err) {
            $translate('feedback.submitted').then(Snackbar);
          }
          pane.done($translate.instant('Error saving feedback'), err);
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
          state: 'configuration.export',
          icon: 'fa-arrow-circle-o-down',
          name: 'Export',
          active: function() {
            return $state.is('configuration.export');
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
        $('#version-update').modal('show');

        // close select2 dropdowns in the background
        $('select.select2-hidden-accessible').each(function(i, e) {
          // prevent errors being thrown if selectors have not been
          // initialised before the update dialog is to be shown
          try { $(e).select2('close'); } catch(e) {}
        });
      };

      $scope.reloadWindow = function() {
        $window.location.reload();
      };

      $scope.postponeUpdate = function() {
        $log.debug('Delaying update');
        $timeout(function() {
          $log.debug('Displaying delayed update ready dialog');
          showUpdateReady();
        }, 2 * 60 * 60 * 1000);
      };

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
        DB.watchDesignDoc(function() {
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
        });
      }

    }
  );

}());
