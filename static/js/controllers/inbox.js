var feedback = require('feedback'),
    _ = require('underscore'),
    moment = require('moment'),
    sendMessage = require('../modules/send-message'),
    tour = require('../modules/tour'),
    modal = require('../modules/modal'),
    format = require('../modules/format'),
    guidedSetup = require('../modules/guided-setup');

require('moment/locales');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl',
    ['$window', '$scope', '$translate', '$rootScope', '$state', '$stateParams', '$timeout', 'translateFilter', 'Facility', 'FacilityHierarchy', 'Form', 'Settings', 'UpdateSettings', 'Contact', 'Language', 'ReadMessages', 'UpdateUser', 'SendMessage', 'UserDistrict', 'DeleteDoc', 'DownloadUrl', 'SetLanguageCookie', 'CountMessages', 'ActiveRequests', 'BaseUrlService', 'DBSync', 'ConflictResolution', 'UserSettings', 'APP_CONFIG', 'DB', 'Session', 'Enketo', 'Changes',
    function ($window, $scope, $translate, $rootScope, $state, $stateParams, $timeout, translateFilter, Facility, FacilityHierarchy, Form, Settings, UpdateSettings, Contact, Language, ReadMessages, UpdateUser, SendMessage, UserDistrict, DeleteDoc, DownloadUrl, SetLanguageCookie, CountMessages, ActiveRequests, BaseUrlService, DBSync, ConflictResolution, UserSettings, APP_CONFIG, DB, Session, Enketo, Changes) {

      Session.init();
      DBSync();
      feedback.init(
        function(doc, callback) {
          DB.get()
            .post(doc)
            .then(function() {
              callback();
            })
            .catch(callback);
        },
        function(callback) {
          callback(null, Session.userCtx());
        }
      );

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
      $scope.analyticsModules = undefined;
      $scope.version = APP_CONFIG.version;
      $scope.actionBar = {};
      $scope.formDefinitions = [];
      $scope.title = undefined;

      $scope.baseUrl = BaseUrlService();

      $scope.logout = function() {
        Session.logout();
      };

      $scope.setFilterQuery = function(query) {
        if (query) {
          $scope.filterQuery.value = query;
        }
      };

      $scope.setAnalyticsModules = function(modules) {
        $scope.analyticsModules = modules;
      };

      $scope.setSelectedModule = function(module) {
        $scope.filterModel.module = module;
      };

      $scope.back = function() {
        $scope.clearSelected();
        $state.go($scope.filterModel.type);
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

      $scope.showBackButton = function(show) {
        $scope.hideTitleBarBackButton = show === false ||
            !_.contains(['reports', 'messages', 'contacts', 'tasks'],
                $scope.filterModel.type);
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
            return console.log(err);
          }
          $window.location.href = url;
        });
      };

      var updateAvailableFacilities = function() {
        FacilityHierarchy(function(err, hierarchy, total) {
          if (err) {
            return console.log('Error loading facilities', err);
          }
          $scope.facilities = hierarchy;
          $scope.facilitiesCount = total;
        });
        Facility({ types: [ 'person' ] }, function(err, people) {
          if (err) {
            return console.log('Failed to retrieve people', err);
          }
          $scope.people = people;
          function formatResult(doc) {
            return doc && format.contact(doc);
          }
          $('.update-facility [name=facility], #edit-user-profile [name=contact]').select2({
            id: function(doc) {
              return doc._id;
            },
            width: '100%',
            escapeMarkup: function(m) {
              return m;
            },
            formatResult: formatResult,
            formatSelection: formatResult,
            initSelection: function (element, callback) {
              var e = element.val();
              if (!e) {
                return callback();
              }
              var row = _.findWhere(people, { _id: e });
              if (!row) {
                return callback();
              }
              callback(row);
            },
            query: function(options) {
              var terms = options.term.toLowerCase().split(/\s+/);
              var matches = _.filter(people, function(doc) {
                var contact = doc.contact;
                var name = contact && contact.name;
                var phone = contact && contact.phone;
                var tags = [ doc.name, name, phone ].join(' ').toLowerCase();
                return _.every(terms, function(term) {
                  return tags.indexOf(term) > -1;
                });
              });
              options.callback({ results: matches });
            },
            sortResults: function(results) {
              results.sort(function(a, b) {
                var aName = formatResult(a).toLowerCase();
                var bName = formatResult(b).toLowerCase();
                return aName.localeCompare(bName);
              });
              return results;
            }
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
          if (change.newDoc) {
            // check if new document is a contact
            return ['person','clinic','health_center','district_hospital']
              .indexOf(change.newDoc.type) !== -1;
          }
          // check known people
          if (_.findWhere($scope.people, { _id: change.id })) {
            return true;
          }
          // check known places
          return findIdInContactHierarchy(change.id, $scope.facilities);
        },
        callback: updateAvailableFacilities
      });

      $scope.updateReadStatus = function() {
        ReadMessages(function(err, data) {
          if (err) {
            return console.log('Error fetching read status', err);
          }
          $scope.readStatus = data;
        });
      };
      $scope.updateReadStatus();
      Changes({
        key: 'inbox-read-status',
        filter: function(change) {
          return change.newDoc && change.newDoc.type === 'data_record';
        },
        callback: $scope.updateReadStatus
      });

      $scope.setupSendMessage = function() {
        sendMessage.init(Settings, Contact, translateFilter);
      };

      Form(function(err, forms) {
        if (err) {
          return console.log('Failed to retrieve forms', err);
        }
        $scope.forms = forms;
      });

      var updateFormDefinitions = function() {
        Enketo.withAllForms()
          .then(function(forms) {
            $scope.formDefinitions = forms;
          })
          .catch(function(err) {
            console.error('Error fetching form definitions', err);
          });
      };
      updateFormDefinitions();
      Changes({
        key: 'inbox-form-definitions',
        filter: function(change) {
          return change.id.indexOf('form:') === 0;
        },
        callback: updateFormDefinitions
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
              return console.log('Error updating user', err);
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
                console.log('Error marking setup_complete', err);
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
                console.log('Error updating user', err);
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
            return console.log('Error getting user', err);
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

      Settings(function(err, settings) {
        if (err) {
          return console.log('Error fetching settings', err);
        }
        $scope.enabledLocales = _.reject(settings.locales, function(locale) {
          return !!locale.disabled;
        });
        updateEditUserModel(function(user) {
          filteredModals = _.filter(startupModals, function(modal) {
            return modal.required(settings, user);
          });
          showModals();
        });
      });

      moment.locale(['en']);

      Language()
        .then(function(language) {
          moment.locale([language, 'en']);
          $translate.use(language);
        })
        .catch(function(err) {
          console.log('Error loading language', err);
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

      var deleteMessageId;

      $scope.deleteDoc = function(id) {
        $('#delete-confirm').modal('show');
        deleteMessageId = id;
      };

      $scope.deleteDocConfirm = function() {
        var pane = modal.start($('#delete-confirm'));
        if (deleteMessageId) {
          DeleteDoc(deleteMessageId, function(err) {
            pane.done(translateFilter('Error deleting document'), err);
          });
        } else {
          pane.done(translateFilter('Error deleting document'), 'No deleteMessageId set');
        }
      };

      $('body').on('mouseenter', '.relative-date, .autoreply', function() {
        if ($(this).data('tooltipLoaded') !== true) {
          $(this).data('tooltipLoaded', true)
            .tooltip({
              placement: 'bottom',
              trigger: 'manual',
              container: 'body'
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

        // we have to wait for language to respond before initing the multidropdowns
        Language().then(function(language) {

          $translate.use(language);

          $translate('date.to').then(function () {

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
              if ($('#back').is(':visible')) {
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

      $scope.setupTour = function() {
        $('#tour-select').on('click', 'a.tour-option', function() {
          $('#tour-select').modal('hide');
        });
      };

      $scope.submitFeedback = function() {
        var pane = modal.start($('#feedback'));
        var message = $('#feedback [name=feedback]').val();
        feedback.submit(message, APP_CONFIG, function(err) {
          pane.done(translateFilter('Error saving feedback'), err);
        });
      };

      UserDistrict(function() {
        $scope.$watch('filterModel', function(curr, prev) {
          if (prev !== curr) {
            $scope.$broadcast('query');
          }
        }, true);
        $scope.$broadcast('query');
      });

      CountMessages.init();

      $scope.$on('$stateChangeStart', ActiveRequests.cancel);

      $scope.reloadWindow = function() {
        $window.location.reload();
      };

      if (window.applicationCache) {
        var showUpdateReady = function() {
          $('#version-update').modal('show');
        };
        window.applicationCache.addEventListener('updateready', showUpdateReady);
        if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
          showUpdateReady();
        }
        DB.watchDesignDoc(function() {
          // if the manifest hasn't changed, prompt user to reload settings
          window.applicationCache.addEventListener('noupdate', showUpdateReady);
          // check if the manifest has changed. if it has, download and prompt
          window.applicationCache.update();
        });
      }

    }
  ]);

}());
