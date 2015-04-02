var utils = require('kujua-utils'),
    feedback = require('feedback'),
    _ = require('underscore'),
    moment = require('moment'),
    version = require('settings/root').version,
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
    ['$window', '$scope', '$translate', '$rootScope', '$state', '$stateParams', '$timeout', 'translateFilter', 'Facility', 'FacilityHierarchy', 'Form', 'Settings', 'UpdateSettings', 'Contact', 'Language', 'ReadMessages', 'UpdateUser', 'SendMessage', 'User', 'UserDistrict', 'UserCtxService', 'Verified', 'DeleteDoc', 'UpdateFacility', 'DownloadUrl', 'SetLanguageCookie',
    function ($window, $scope, $translate, $rootScope, $state, $stateParams, $timeout, translateFilter, Facility, FacilityHierarchy, Form, Settings, UpdateSettings, Contact, Language, ReadMessages, UpdateUser, SendMessage, User, UserDistrict, UserCtxService, Verified, DeleteDoc, UpdateFacility, DownloadUrl, SetLanguageCookie) {

      $scope.loadingContent = false;
      $scope.error = false;
      $scope.errorSyntax = false;
      $scope.appending = false;
      $scope.languages = [];
      $scope.forms = [];
      $scope.facilities = [];
      $scope.items = [];
      $scope.totalItems = undefined;
      $scope.selected = undefined;
      $scope.filterQuery = { value: undefined };
      $scope.analyticsModules = undefined;
      $scope.version = version;

      $scope.setFilterQuery = function(query) {
        if (!$scope.filterQuery.value && query) {
          $scope.filterQuery.value = query;
        }
      };

      $scope.setAnalyticsModules = function(modules) {
        $scope.analyticsModules = modules;
      };

      $scope.setSelectedModule = function(module) {
        $scope.filterModel.module = module;
      };

      var clearSelectedTimer;

      $scope.setSelected = function(selected) {
        $timeout.cancel(clearSelectedTimer);
        $scope.loadingContent = false;
        if (selected) {
          $scope.selected = selected;
          $timeout(function() {
            $scope.showContent = true;
            $timeout(function() {
              $('.item-body').scrollTop(0);
            });
          });
        } else if($scope.selected) {
          $scope.showContent = false;
          if ($('#back').is(':visible')) {
            clearSelectedTimer = $timeout(function() {
              $scope.selected = undefined;
            }, 500);
          } else {
            $scope.selected = undefined;
          }
        }
      };

      $scope.select = function(id) {
        if ($stateParams.id === id) {
          // message already set - make sure we're showing content
          if ($scope.filterModel.type === 'messages') {
            return;
          }
          var message = _.findWhere($scope.items, { _id: id });
          if (message) {
            return $scope.setSelected(message);
          }
          $state.reload();
          $scope.$broadcast('query');
        } else if (id) {
          $state.go($scope.filterModel.type + '.detail', { id: id });
        } else {
          $state.go($scope.filterModel.type);
        }
      };

      $scope.setLoadingContent = function(id) {
        $scope.loadingContent = id;
        $timeout(function() {
          $scope.showContent = true;
        });
      };

      var removeDeletedContacts = function(contacts) {
        var existingKey;
        var checkExisting = function(updated) {
          return existingKey === updated.key[1];
        };
        for (var i = $scope.items.length - 1; i >= 0; i--) {
          existingKey = $scope.items[i].key[1];
          if (!_.some(contacts, checkExisting)) {
            $scope.items.splice(i, 1);
          }
        }
      };

      var mergeUpdatedContacts = function(contacts) {
        _.each(contacts, function(updated) {
          var match = _.find($scope.items, function(existing) {
            return existing.key[1] === updated.key[1];
          });
          if (match) {
            if (!_.isEqual(updated.value, match.value)) {
              match.value = updated.value;
            }
          } else {
            $scope.items.push(updated);
          }
        });
      };

      $scope.setMessages = function(options) {
        options = options || {};
        if (options.changes) {
          removeDeletedContacts(options.contacts);
          mergeUpdatedContacts(options.contacts);
        } else {
          $scope.items = options.contacts || [];
        }
      };

      $scope.setReports = function(reports) {
        $scope.items = reports || [];
      };

      $scope.setContacts = function(contacts) {
        $scope.items = contacts || [];
      };

      $scope.isRead = function(message) {
        if ($scope.filterModel.type === 'reports' &&
            $scope.selected &&
            $scope.selected._id === message._id) {
          return true;
        }
        return _.contains(message.read, UserCtxService().name);
      };

      $scope.permissions = {
        admin: utils.isUserAdmin(UserCtxService()),
        nationalAdmin: utils.isUserNationalAdmin(UserCtxService()),
        districtAdmin: utils.isUserDistrictAdmin(UserCtxService()),
        district: undefined,
        canExport: utils.hasPerm(UserCtxService(), 'can_export_messages') || 
                   utils.hasPerm(UserCtxService(), 'can_export_forms')
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

      $scope.updateAvailableFacilities = function() {
        UserDistrict(function(err, district) {
          if (err) {
            return console.log('Error fetching district', err);
          }
          FacilityHierarchy(district, function(err, hierarchy, total) {
            if (err) {
              return console.log('Error loading facilities', err);
            }
            $scope.facilities = hierarchy;
            $scope.facilitiesCount = total;
          });
          Facility({ district: district, types: [ 'clinic' ] }, function(err, facilities) {
            if (err) {
              return console.log('Failed to retrieve facilities', err);
            }
            function formatResult(row) {
              return format.contact(row.doc);
            }
            $('#update-facility [name=facility]').select2({
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
                var row = _.findWhere(facilities, { id: e });
                if (!row) {
                  return callback();
                }
                callback(row);
              },
              query: function(options) {
                var terms = options.term.toLowerCase().split(/\s+/);
                var matches = _.filter(facilities, function(val) {
                  var contact = val.doc.contact;
                  var name = contact && contact.name;
                  var phone = contact && contact.phone;
                  var tags = [ val.doc.name, name, phone ].join(' ').toLowerCase();
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
        });
      };

      $scope.updateReadStatus = function () {
        ReadMessages({
          user: UserCtxService().name,
          district: $scope.permissions.district
        }).then(
          function(res) {
            $scope.readStatus = res;
          },
          function() {
            console.log('Failed to retrieve read status');
          }
        );
      };

      UserDistrict(function(err, district) {
        if (err) {
          console.log('Error fetching user district', err);
          if (err !== 'Not logged in') {
            $('body').html(err);
          }
          return;
        }
        $scope.permissions.district = district;
        $scope.updateReadStatus();
      });

      $scope.setupSendMessage = function() {
        sendMessage.init(Settings, Contact, translateFilter);
      };

      Form().then(
        function(forms) {
          $scope.forms = forms;
        },
        function(err) {
          console.log('Failed to retrieve forms', err);
        }
      );

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
          var id = 'org.couchdb.user:' + UserCtxService().name;
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
            var id = 'org.couchdb.user:' + UserCtxService().name;
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

      $scope.$on('UsersUpdated', function(e, userId) {
        console.log('UsersUpdated', userId, editUserModel.id);
        if (editUserModel.id === userId) {
          updateEditUserModel();
        }
      });

      var updateEditUserModel = function(callback) {
        User(function(err, user) {
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
            language: { code: user.language }
          };
          if (callback) {
            callback(user);
          }
        });
      };

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

      Language(function(err, language) {
        if (err) {
          return console.log('Error loading language', err);
        }
        moment.locale([language, 'en']);
        $translate.use(language);
      });

      $scope.sendMessage = function(event) {
        sendMessage.validate(event.target, function(recipients, message) {
          var pane = modal.start($(event.target).closest('.message-form'));
          SendMessage(recipients, message).then(
            function() {
              pane.done();
            },
            function(err) {
              pane.done(translateFilter('Error sending message'), err);
            }
          );
        });
      };

      $scope.verify = function(verify) {
        if ($scope.selected.form) {
          Verified($scope.selected._id, verify, function(err) {
            if (err) {
              console.log('Error verifying message', err);
            }
          });
        }
      };

      var deleteMessageId;

      $scope.deleteDoc = function(id) {
        $('#delete-confirm').modal('show');
        deleteMessageId = id;
      };

      $scope.deleteDocConfirm = function() {
        var pane = modal.start($('#delete-confirm'));
        if (deleteMessageId) {
          DeleteDoc(deleteMessageId, function(err, doc) {
            if (!err) {
              if (doc.type !== 'data_record') {
                $rootScope.$broadcast('ContactUpdated', doc);
              }
            }
            pane.done(translateFilter('Error deleting document'), err);
          });
        } else {
          pane.done(translateFilter('Error deleting document'), 'No deleteMessageId set');
        }
      };

      $scope.updateFacility = function() {
        var $modal = $('#update-facility');
        var facilityId = $modal.find('[name=facility]').val();
        if (!facilityId) {
          $modal.find('.modal-footer .note')
            .text(translateFilter('Please select a facility'));
          return;
        }
        var pane = modal.start($modal);
        UpdateFacility($scope.selected._id, facilityId, function(err) {
          pane.done(translateFilter('Error updating facility'), err);
        });
      };
      $scope.edit = function(record) {
        if ($scope.filterModel.type === 'reports') {
          var val;
          if (record.related_entities && record.related_entities.clinic) {
            val = record.related_entities.clinic._id;
          }
          $('#update-facility [name=facility]').select2('val', val || '');
          $('#update-facility').modal('show');
        } else {
          $rootScope.$broadcast('EditContactInit', record);
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
        Language(function(err, language) {

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
        feedback.submit(message, function(err) {
          pane.done(translateFilter('Error saving feedback'), err);
        });
      };

      $scope.setupHeader = function() {
        Settings(function(err, settings) {
          if (err) {
            return console.log('Error retrieving settings', err);
          }
          require('../modules/add-record').init(settings.muvuku_webapp_url);
        });
        require('../modules/manage-session').init();
      };

      UserDistrict(function() {
        $scope.$watch('filterModel', function(curr, prev) {
          if (prev !== curr) {
            $scope.$broadcast('query');
          }
        }, true);
        $scope.$broadcast('query');
      });

    }
  ]);

  require('./messages');
  require('./messages-content');
  require('./reports');
  require('./reports-content');
  require('./analytics');
  require('./contacts');
  require('./contacts-content');
  require('./configuration');
  require('./edit-language');
  require('./delete-language');
  require('./edit-translation');
  require('./import-translation');
  require('./import-contacts');
  require('./configuration-settings-basic');
  require('./configuration-settings-advanced');
  require('./configuration-translation-languages');
  require('./configuration-translation-application');
  require('./configuration-translation-messages');
  require('./configuration-forms');
  require('./configuration-users');
  require('./configuration-export');
  require('./delete-user');
  require('./edit-user');
  require('./edit-contact');
  require('./help');
  require('./help-search');
  require('./theme');
  require('./error');

}());
