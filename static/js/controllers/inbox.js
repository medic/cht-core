var feedback = require('../modules/feedback'),
    _ = require('underscore'),
    moment = require('moment'),
    sendMessage = require('../modules/send-message'),
    tour = require('../modules/tour'),
    modal = require('../modules/modal'),
    format = require('../modules/format'),
    guidedSetup = require('../modules/guided-setup'),
    ajaxDownload = require('../modules/ajax-download');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl',
    ['$window', '$scope', '$translate', '$rootScope', '$state', '$timeout', '$log', '$http', 'translateFilter', 'Facility', 'FacilityHierarchy', 'Form', 'Settings', 'UpdateSettings', 'Contact', 'Language', 'LiveListConfig', 'ReadMessages', 'UpdateUser', 'SendMessage', 'UserDistrict', 'CheckDate', 'DeleteDoc', 'DownloadUrl', 'SetLanguageCookie', 'CountMessages', 'BaseUrlService', 'DBSync', 'Snackbar', 'UserSettings', 'APP_CONFIG', 'DB', 'Session', 'Enketo', 'Changes', 'AnalyticsModules', 'Auth', 'TrafficStats', 'XmlForms', 'CONTACT_TYPES',
    function ($window, $scope, $translate, $rootScope, $state, $timeout, $log, $http, translateFilter, Facility, FacilityHierarchy, Form, Settings, UpdateSettings, Contact, Language, LiveListConfig, ReadMessages, UpdateUser, SendMessage, UserDistrict, CheckDate, DeleteDoc, DownloadUrl, SetLanguageCookie, CountMessages, BaseUrlService, DBSync, Snackbar, UserSettings, APP_CONFIG, DB, Session, Enketo, Changes, AnalyticsModules, Auth, TrafficStats, XmlForms, CONTACT_TYPES) {

      Session.init();
      TrafficStats($scope);
      DBSync();
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
      $scope.analyticsModules = [];
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
            $scope.cancel();
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

      $scope.cancel = function() {
        $('#navigation-confirm').modal('show');
      };

      $scope.cancelConfirm = function() {
        $('#navigation-confirm').modal('hide');
        if ($scope.cancelCallback) {
          $scope.cancelCallback();
        }
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

      $scope.filterModel = {
        type: 'messages',
        forms: [],
        facilities: [],
        contactTypes: [],
        valid: undefined,
        verified: undefined,
        date: { }
      };

      $scope.resetFilterModel = function() {
        $scope.filterQuery.value = '';
        $scope.filterModel.forms = [];
        $scope.filterModel.facilities = [];
        $scope.filterModel.contactTypes = [];
        $scope.filterModel.valid = undefined;
        $scope.filterModel.date = {};

        $('.filter.multidropdown').each(function() {
          $(this).multiDropdown().reset();
        });

        $scope.$broadcast('query');
      };

      $scope.download = function() {
        DownloadUrl($scope, $scope.filterModel.type, function(err, url) {
          if (err) {
            return $log.error(err);
          }
          $http.post(url)
            .then(ajaxDownload.download)
            .catch(function(err) {
              $log.error('Error downloading', err);
            });
        });
      };

      var updateAvailableFacilities = function() {
        FacilityHierarchy(function(err, hierarchy, total) {
          if (err) {
            return $log.error('Error loading facilities', err);
          }
          $scope.facilities = hierarchy;
          $scope.facilitiesCount = total;
        });
        Facility({ types: [ 'person' ] }, function(err, people) {
          if (err) {
            return $log.error('Failed to retrieve people', err);
          }
          $scope.people = people;
          function formatResult(doc) {
            return doc && format.contact(doc);
          }

          function $formatResult(data) {
            if (data.text) {
              return data.text;
            }
            return $(formatResult(data.doc));
          }

          function formatSelection(data) {
            return data.text || data.doc.name;
          }

          $.fn.select2.amd.require(
          ['select2/data/array', 'select2/utils'],
          function (ArrayData, Utils) {
            function CustomData ($element, options) {
              CustomData.__super__.constructor.call(this, $element, options);
            }

            Utils.Extend(CustomData, ArrayData);

            function sortResults(results) {
              results.sort(function(a, b) {
                var aName = formatResult(a).toLowerCase();
                var bName = formatResult(b).toLowerCase();
                return aName.localeCompare(bName);
              });
              return results;
            }

            CustomData.prototype.query = function (params, callback) {
              var terms = params.term ? params.term.toLowerCase().split(/\s+/) : [];

              var matches = _.filter(people, function(doc) {
                var contact = doc.contact;
                var name = contact && contact.name;
                var phone = contact && contact.phone;
                var tags = [ doc.name, name, phone ].join(' ').toLowerCase();
                return _.every(terms, function(term) {
                  return tags.indexOf(term) > -1;
                });
              });

              matches = sortResults(matches);
              matches = _.map(matches, function(doc) {
                return { id: doc._id, doc: doc };
              });

              callback({ results: matches });
            };

            $('.update-facility [name=facility], #edit-user-profile [name=contact]').select2({
              dataAdapter: CustomData,
              templateResult: $formatResult,
              templateSelection: formatSelection,
              width: '100%',
            });

          });

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
          // check if new document is a contact
          return CONTACT_TYPES.indexOf(change.doc.type) !== -1;
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
      $scope.updateReadStatus();
      Changes({
        key: 'inbox-read-status',
        filter: function(change) {
          return change.doc.type === 'data_record';
        },
        callback: $scope.updateReadStatus
      });

      $scope.setupSendMessage = function() {
        sendMessage.init(Settings, Contact, translateFilter);
      };

      Form()
        .then(function(forms) {
          $scope.forms = forms;
        })
        .catch(function(err) {
          $log.error('Failed to retrieve forms', err);
        });

      XmlForms('InboxCtrl', { contactForms: false }, function(err, forms) {
        if (err) {
          return $log.error('Error fetching form definitions', err);
        }
        Enketo.clearXmlCache();
        $scope.nonContactForms = forms;
      });

      $scope.setupGuidedSetup = function() {
        guidedSetup.init(Settings, UpdateSettings, translateFilter);
        modalsInited.guidedSetup = true;
        showModals();
      };

      $scope.setupWelcome = function() {
        modalsInited.welcome = true;
        showModals();
      };

      $scope.setupUserLanguage = function() {
        $('#user-language').on('click', '.horizontal-options a', function(e) {
          e.preventDefault();
          var elem = $(this);
          elem.closest('.horizontal-options')
            .find('.selected')
            .removeClass('selected');
          elem.addClass('selected');
        });
        $('#user-language .btn-primary').on('click', function(e) {
          e.preventDefault();
          var btn = $(this);
          btn.addClass('disabled');
          var selected = $(this).closest('.modal-content')
                                .find('.selected')
                                .attr('data-value');
          var id = 'org.couchdb.user:' + Session.userCtx().name;
          UpdateUser(id, { language: selected }, function(err) {
            btn.removeClass('disabled');
            if (err) {
              return $log.error('Error updating user', err);
            }
            $('#user-language').modal('hide');
          });
        });
        modalsInited.userLanguage = true;
        showModals();
      };

      $scope.changeLanguage = function(code) {
        moment.locale([code, 'en']);
        $translate.use(code);
        SetLanguageCookie(code);
      };

      var startupModals = [
        // select language
        {
          required: function(settings, user) {
            return !user.language;
          },
          render: function(callback) {
            $('#user-language').modal('show');
            $('#user-language').on('hide.bs.modal', callback);
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
            tour.start('intro', translateFilter);
            var id = 'org.couchdb.user:' + Session.userCtx().name;
            UpdateUser(id, { known: true }, function(err) {
              if (err) {
                $log.error('Error updating user', err);
              }
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
              pane.done(translateFilter('Error sending message'), err);
            });
        });
      };

      $scope.setActionBar = function(model) {
        $scope.actionBar = model;
      };

      $scope.emit = function() {
        $rootScope.$broadcast.apply($rootScope, arguments);
      };

      var docToDeleteId;

      $scope.deleteDoc = function(id) {
        $('#delete-confirm').modal('show');
        docToDeleteId = id;
      };

      $scope.deleteDocConfirm = function() {
        var pane = modal.start($('#delete-confirm'));
        if (docToDeleteId) {
          DeleteDoc(docToDeleteId, function(err) {
            pane.done(translateFilter('Error deleting document'), err);
            if (!err) {
              // return to list view for the current state
              var stateName = $state.current.name,
                  dotIndex = stateName.indexOf('.');
              if(dotIndex !== -1) {
                stateName = stateName.substring(0, dotIndex);
              }
              $state.go(stateName);
              Snackbar(translateFilter('document.deleted'));
            }
          });
        } else {
          pane.done(translateFilter('Error deleting document'), 'No docToDeleteId set');
        }
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

      // TODO we should eliminate the need for this function as much as possible
      var angularApply = function(callback) {
        var scope = angular.element($('body')).scope();
        if (scope) {
          scope.$apply(callback);
        }
      };

      var getTernaryValue = function(positive, negative) {
        if (positive && !negative) {
          return true;
        }
        if (!positive && negative) {
          return false;
        }
      };

      $scope.setupFilters = function() {

        $('#search').on('click', function(e) {
          e.preventDefault();
          $scope.$broadcast('query');
        });
        $('#freetext').on('keypress', function(e) {
          if (e.which === 13) {
            e.preventDefault();
            $scope.$broadcast('query');
          }
        });

        var performMobileSearch = function(e) {
          e.preventDefault();
          $scope.$broadcast('query');
          $(e.target).closest('.filter').removeClass('open');
        };
        $('#mobile-search-go').on('click', performMobileSearch);
        $('#mobile-freetext').on('keypress', function(e) {
          if (e.which === 13) {
            performMobileSearch(e);
          }
        });
        $('.mobile-freetext-filter').on('shown.bs.dropdown', function() {
          $('#mobile-freetext').focus();
        });

        // stop bootstrap closing the search pane on click
        $('.filters .mobile-freetext-filter .search-pane').on('click', function(e) {
          e.stopPropagation();
        });

        $translate.onReady().then(function() {
          // we have to wait for language to respond before initing the multidropdowns
          Language().then(function(language) {

            $translate.use(language);

            $('#formTypeDropdown, #facilityDropdown, #contactTypeDropdown').each(function() {
              $(this).multiDropdown({
                label: function(state, callback) {
                  if (state.selected.length === 0 || state.selected.length === state.total.length) {
                    return callback($translate.instant(state.menu.data('label-no-filter')));
                  }
                  if (state.selected.length === 1) {
                    return callback(state.selected.first().text());
                  }
                  callback($translate.instant(
                    state.menu.data('filter-label'), { number: state.selected.length }
                  ));
                },
                selectAllLabel: $translate.instant('select all'),
                clearLabel: $translate.instant('clear')
              });
            });

            $('#statusDropdown').multiDropdown({
              label: function(state, callback) {
                var values = {};
                state.selected.each(function() {
                  var elem = $(this);
                  values[elem.data('value')] = elem.text();
                });
                var parts = [];
                if (values.valid && !values.invalid) {
                  parts.push(values.valid);
                } else if (!values.valid && values.invalid) {
                  parts.push(values.invalid);
                }
                if (values.verified && !values.unverified) {
                  parts.push(values.verified);
                } else if (!values.verified && values.unverified) {
                  parts.push(values.unverified);
                }
                if (parts.length === 0 || parts.length === state.total.length) {
                  return callback($translate.instant(state.menu.data('label-no-filter')));
                }
                return callback(parts.join(', '));
              },
              selectAllLabel: $translate.instant('select all'),
              clearLabel: $translate.instant('clear')
            });

            var start = $scope.filterModel.date.from ?
              moment($scope.filterModel.date.from) : moment().subtract(1, 'months');
            $('#date-filter').daterangepicker({
              startDate: start,
              endDate: moment($scope.filterModel.date.to),
              maxDate: moment(),
              opens: 'center',
              applyClass: 'btn-primary',
              cancelClass: 'btn-link',
              locale: {
                applyLabel: $translate.instant('Apply'),
                cancelLabel: $translate.instant('Cancel'),
                fromLabel: $translate.instant('date.from'),
                toLabel: $translate.instant('date.to'),
                daysOfWeek: moment.weekdaysMin(),
                monthNames: moment.monthsShort(),
                firstDay: moment.localeData()._week.dow
              }
            },
            function(start, end) {
              var scope = angular.element($('body')).scope();
              if (scope) {
                scope.$apply(function() {
                  scope.filterModel.date.from = start.valueOf();
                  scope.filterModel.date.to = end.valueOf();
                });
              }
            })
            .on('mm.dateSelected.daterangepicker', function(e, picker) {
              if ($scope.isMobile()) {
                // mobile version - only show one calendar at a time
                if (picker.container.is('.show-from')) {
                  picker.container.removeClass('show-from').addClass('show-to');
                } else {
                  picker.container.removeClass('show-to').addClass('show-from');
                  picker.hide();
                }
              }
            });
            $('.daterangepicker').addClass('filter-daterangepicker mm-dropdown-menu show-from');

            $('#formTypeDropdown').on('update', function() {
              var forms = $(this).multiDropdown().val();
              angularApply(function(scope) {
                scope.filterModel.forms = forms;
              });
            });

            $('#facilityDropdown').on('update', function() {
              var ids = $(this).multiDropdown().val();
              angularApply(function(scope) {
                scope.filterModel.facilities = ids;
              });
            });

            $('#contactTypeDropdown').on('update', function() {
              var ids = $(this).multiDropdown().val();
              angularApply(function(scope) {
                scope.filterModel.contactTypes = ids;
              });
            });

            $('#statusDropdown').on('update', function() {
              var values = $(this).multiDropdown().val();
              angularApply(function(scope) {
                scope.filterModel.valid = getTernaryValue(
                  _.contains(values, 'valid'),
                  _.contains(values, 'invalid')
                );
                scope.filterModel.verified = getTernaryValue(
                  _.contains(values, 'verified'),
                  _.contains(values, 'unverified')
                );
              });
            });
          });
        });
      };


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

      $scope.setSelectedModule = function(module) {
        $scope.filterModel.module = module;
      };

      $scope.fetchAnalyticsModules = function() {
        return AnalyticsModules().then(function(modules) {
          $scope.analyticsModules = modules;
          return modules;
        });
      };

      $scope.fetchAnalyticsModules()
        .then(function(modules) {
          if (_.findWhere(modules, { id: 'anc' })) {
            Auth('can_view_analytics').then(function() {
              $scope.tours.push({
                order: 3,
                id: 'analytics',
                icon: 'fa-bar-chart-o',
                name: 'Analytics'
              });
            });
          }
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
            Snackbar(translateFilter('feedback.submitted'));
          }
          pane.done(translateFilter('Error saving feedback'), err);
        });
      };

      $scope.configurationPages = [
        {
          state: 'configuration.settings.basic',
          icon: 'fa-cog',
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
          name: 'permissions',
          active: function() {
            return $state.is('configuration.permissions');
          }
        },
      ];

      UserDistrict(function() {
        $scope.$watch('filterModel', function(curr, prev) {
          if (prev !== curr) {
            $scope.$broadcast('query');
          }
        }, true);
        $scope.$broadcast('query');
      });

      CountMessages.init();

      var showUpdateReady = function() {
        $('#version-update').modal('show');

        // close select2 dropdowns in the background
        $('select.select2-hidden-accessible').each(function(i, e) {
          // prevent errors being thrown if selecters have not been
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
  ]);

}());
