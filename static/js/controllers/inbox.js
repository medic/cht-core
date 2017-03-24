var feedback = require('../modules/feedback'),
    _ = require('underscore'),
    moment = require('moment');

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
      PlaceHierarchy,
      JsonForms,
      Language,
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
      UpdateSettings,
      UpdateUser,
      UserSettings,
      XmlForms
    ) {
      'ngInject';

      Session.init();

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
        $timeout(function() {
          if ($scope.cancelCallback) {
            $scope.navigationCancel();
          } else {
            $scope.clearSelected();
          }
        });
      });

      // User wants to cancel current flow, or pressed back button, etc.
      $scope.navigationCancel = function() {
        Modal({
          templateUrl: 'templates/modals/navigation_confirm.html',
          controller: 'NavigationConfirmCtrl',
          singleton: true
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
        $scope.setTitle();
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

      $scope.setTitle = function(title) {
        $scope.title = title;
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
                name: xForm.title,
                icon: xForm.icon
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
        $scope.nonContactForms = xForms;
      });

      $scope.showMedicReporter = function(jsonformCode) {
        Modal({
          templateUrl: 'templates/modals/medic_reporter.html',
          controller: 'MedicReporterModalCtrl',
          model: { formCode: jsonformCode }
        });
      };

      Tour.getTours().then(function(tours) {
        $scope.tours = tours;
      });

      $scope.openTourSelect = function() {
        return Modal({
          templateUrl: 'templates/modals/tour_select.html',
          controller: 'TourSelectCtrl',
          singleton: true
        }).catch(function() {}); // modal dismissed is ok
      };

      $scope.openGuidedSetup = function() {
        return Modal({
          templateUrl: 'templates/modals/guided_setup.html',
          controller: 'GuidedSetupModalCtrl',
          size: 'lg'
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
              controller: 'UserLanguageModalCtrl'
            }).catch(function() {});
          }
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
              size: 'lg'
            }).catch(function() {});
          }
        },
        // guided setup
        {
          required: function(settings) {
            return !settings.setup_complete;
          },
          render: function() {
            return $scope.openGuidedSetup()
              .then(function() {
                return UpdateSettings({ setup_complete: true });
              })
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
            return $scope.openTourSelect()
              .then(function() {
                var id = 'org.couchdb.user:' + Session.userCtx().name;
                return UpdateUser(id, { known: true });
              })
              .catch(function(err) {
                $log.error('Error updating user', err);
              });
          }
        },
      ];

      $q.all([ Settings(), UserSettings() ])
        .then(function(results) {
          var filteredModals = _.filter(startupModals, function(modal) {
            return modal.required(results[0], results[1]);
          });
          var showModals = function() {
            if (filteredModals && filteredModals.length) {
              // render the first modal and recursively show the rest
              filteredModals.shift().render().then(showModals);
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
          $log.warn('Trying to delete empty object', docs);
          return;
        }
        if (!_.isArray(docs)) {
          docs = [ docs ];
        }
        if (!docs.length) {
          $log.warn('Trying to delete empty array', docs);
          return;
        }
        Modal({
          templateUrl: 'templates/modals/delete_doc_confirm.html',
          controller: 'DeleteDocConfirm',
          model: { docs: docs }
        }).then(function() {
          if (!$scope.selectMode &&
              ($state.includes('contacts') || $state.includes('reports'))) {
            $state.go($state.current.name, { id: null });
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

      CountMessages.init();

      // close select2 dropdowns in the background
      var closeDropdowns = function() {
        $('select.select2-hidden-accessible').each(function() {
          // prevent errors being thrown if selectors have not been
          // initialised yet
          try { $(this).select2('close'); } catch(e) {}
        });
      };

      // close all select2 menus on navigation
      // https://github.com/medic/medic-webapp/issues/2927
      $rootScope.$on('$stateChangeStart', closeDropdowns);

      var showUpdateReady = function() {
        Modal({
          templateUrl: 'templates/modals/version_update.html',
          controller: 'VersionUpdateCtrl',
          singleton: true
        })
        .catch(function() {
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
