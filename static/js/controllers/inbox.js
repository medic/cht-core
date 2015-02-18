var utils = require('kujua-utils'),
    feedback = require('feedback'),
    _ = require('underscore'),
    moment = require('moment'),
    version = require('settings/root').version,
    sendMessage = require('../modules/send-message'),
    tour = require('../modules/tour'),
    modal = require('../modules/modal'),
    format = require('../modules/format'),
    libphonenumber = require('libphonenumber/utils');

require('moment/locales');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl', 
    ['$window', '$scope', '$route', '$location', '$translate', '$animate', '$rootScope', '$state', '$stateParams', 'translateFilter', 'Facility', 'Form', 'Settings', 'UpdateSettings', 'Contact', 'Language', 'ReadMessages', 'UpdateUser', 'SendMessage', 'User', 'UserDistrict', 'UserCtxService', 'Verified', 'DeleteMessage', 'UpdateFacility', 'GenerateSearchQuery', 'DownloadUrl',
    function ($window, $scope, $route, $location, $translate, $animate, $rootScope, $state, $stateParams, translateFilter, Facility, Form, Settings, UpdateSettings, Contact, Language, ReadMessages, UpdateUser, SendMessage, User, UserDistrict, UserCtxService, Verified, DeleteMessage, UpdateFacility, GenerateSearchQuery, DownloadUrl) {

      $scope.loading = true;
      $scope.error = false;
      $scope.errorSyntax = false;
      $scope.appending = false;
      $scope.languages = [];
      $scope.forms = [];
      $scope.facilities = [];
      $scope.contacts = undefined;
      $scope.messages = undefined;
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

      $scope.isSelected = function() {
        return !!$scope.selected;
      };

      var clearSelectedTimer;

      $scope.setSelected = function(selected) {
        clearTimeout(clearSelectedTimer);
        if (selected) {
          $scope.selected = selected;
          setTimeout(function() {
            $('body').addClass('show-content');
          }, 1);
        } else if($scope.selected) {
          setTimeout(function() {
            $('body').removeClass('show-content');
          }, 1);
          if ($('#back').is(':visible')) {
            clearSelectedTimer = setTimeout(function() {
              $scope.selected = undefined;
              if (!$rootScope.$$phase) {
                $rootScope.$apply();
              }
            }, 500);
          } else {
            $scope.selected = undefined;
          }
        }
      };

      var removeDeletedContacts = function(contacts) {
        var existingKey;
        var checkExisting = function(updated) {
          return existingKey === updated.key[1];
        };
        for (var i = $scope.contacts.length - 1; i >= 0; i--) {
          existingKey = $scope.contacts[i].key[1];
          if (!_.some(contacts, checkExisting)) {
            $scope.contacts.splice(i, 1);
          }
        }
      };

      var mergeUpdatedContacts = function(contacts) {
        _.each(contacts, function(updated) {
          var match = _.find($scope.contacts, function(existing) {
            return existing.key[1] === updated.key[1];
          });
          if (match) {
            if (!_.isEqual(updated.value, match.value)) {
              match.value = updated.value;
            }
          } else {
            $scope.contacts.push(updated);
          }
        });
      };

      $scope.setContacts = function(options) {
        $scope.loading = false;
        $animate.enabled(false);
        if (options.changes) {
          removeDeletedContacts(options.contacts);
          mergeUpdatedContacts(options.contacts);
        } else {
          $scope.contacts = options.contacts;
        }
      };

      $scope.setMessages = function(messages) {
        $scope.loading = false;
        $scope.messages = messages;
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
        valid: undefined,
        verified: undefined,
        date: { }
      };

      $scope.resetFilterModel = function() {
        $scope.filterQuery.value = '';
        $scope.filterModel.forms = [];
        $scope.filterModel.facilities = [];
        $scope.filterModel.valid = undefined;
        $scope.filterModel.date = {};
        $scope.$broadcast('filters-reset');
      };

      $scope.download = function() {
        DownloadUrl($scope, $scope.filterModel.type, function(err, url) {
          if (err) {
            return console.log(err);
          }
          $window.location.href = url;
        });
      };

      $scope.setMessage = function(id) {
        if ($scope.filterModel.type === 'reports' && $stateParams.id === id) {
          // message already set - make sure we're showing content
          var message = _.findWhere($scope.messages, { _id: id });
          if (message) {
            $scope.setSelected(message);
          } else {
            $state.reload();
          }
        } else {
          $state.go($scope.filterModel.type + '.detail', { id: id });
        }
      };

      $scope.updateAvailableFacilities = function() {
        UserDistrict(function(err, district) {
          if (err) {
            return console.log('Error fetching district', err);
          }
          Facility(district).then(
            function(res) {
              $scope.facilities = res;
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
                  var row = _.findWhere(res, { id: e });
                  if (!row) {
                    return callback();
                  }
                  callback(row);
                },
                query: function(options) {
                  var terms = options.term.toLowerCase().split(/\s+/);
                  var matches = _.filter(res, function(val) {
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
            },
            function() {
              console.log('Failed to retrieve facilities');
            }
          );
        });
      };

      var updateContacts = function() {
        Contact($scope.permissions.district).then(
          function(rows) {
            $('#send-message [name=phone]').data('options', rows);
          },
          function() {
            console.log('Failed to retrieve contacts');
          }
        );
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
        Settings(function(err, res) {
          sendMessage.init(res, translateFilter);
          updateContacts();
        });
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
        Settings(function(err, res) {
          if (err) {
            return console.log('Error fetching settings', err);
          }
          window.setTimeout(function() {
            $('#guided-setup [name=gateway-number]')
              .val(res.gateway_number).trigger('input');
            $('#guided-setup [name=default-country-code]')
              .val(res.default_country_code).trigger('input');
            $('#primary-contact-content a[data-value=' + res.care_coordinator + ']')
              .trigger('click');
            $('#language-preference-content .locale a[data-value=' + res.locale + ']')
              .trigger('click');
            $('#language-preference-content .locale-outgoing a[data-value=' + res.locale_outgoing + ']')
              .trigger('click');
            $('#registration-form-content a[data-value=' + res.anc_registration_lmp + ']')
              .trigger('click');
            $('#anonymous-statistics-content a[data-value=' + res.statistics_submission + ']')
              .trigger('click');
          }, 1);
        });

        $('#guided-setup').on('click', '.horizontal-options a', function(e) {
          e.preventDefault();
          var elem = $(this);
          elem.closest('.horizontal-options')
            .find('.selected')
            .removeClass('selected');
          elem.addClass('selected');
          var panel = elem.closest('.panel');
          var label = [];
          panel.find('.horizontal-options .selected').each(function() {
            label.push($(this).text().trim());
          });
          panel
            .addClass('panel-complete')
            .find('.panel-heading .value')
            .text(label.join(', '));
        });

        $('#modem-setup-content').on('input', 'input', function() {
          var gatewayNumber = $('#gateway-number').val();
          var defaultCountryCode = $('#default-country-code').val();
          if (gatewayNumber && defaultCountryCode) {
            $(this).closest('.panel')
              .addClass('panel-complete')
              .find('.panel-heading .value')
              .text(gatewayNumber + ', ' + defaultCountryCode);
          }
        });

        var validate = function() {
          var phoneRegex = /^\d+$/;
          var countryCode = $('#guided-setup [name=default-country-code]').val();
          if (countryCode && !phoneRegex.test(countryCode)) {
            return {
              valid: false,
              error: translateFilter('field digits only', {
                field: translateFilter('Default country code')
              })
            };
          }
          var gatewayNumber = $('#guided-setup [name=gateway-number]').val();
          if (gatewayNumber &&
              !libphonenumber.validate({ default_country_code: countryCode }, gatewayNumber)) {
            return {
              valid: false,
              error: translateFilter('Phone number not valid')
            };
          }
          return { valid: true };
        };

        $('#setup-wizard-save').on('click', function(e) {
          e.preventDefault();

          var valid = validate();
          if (!valid.valid) {
            $('#guided-setup .error').text(valid.error).show();
            return;
          }

          $('#setup-wizard-save').addClass('disabled');
          $('#guided-setup .fa-spinner').show();
          $('#guided-setup .error').hide();
          var settings = {};
          var val;

          val = $('#guided-setup [name=gateway-number]').val();
          if (val) {
            settings.gateway_number = val;
          }
          val = $('#guided-setup [name=default-country-code]').val();
          if (val) {
            settings.default_country_code = val;
          }
          val = $('#primary-contact-content .horizontal-options .selected').attr('data-value');
          if (val) {
            settings.care_coordinator = val;
          }
          val = $('#language-preference-content .locale .selected').attr('data-value');
          if (val) {
            settings.locale = val;
          }
          val = $('#language-preference-content .locale-outgoing .selected').attr('data-value');
          if (val) {
            settings.locale_outgoing = val;
          }
          val = $('#registration-form-content .horizontal-options .selected').attr('data-value');
          if (val) {
            settings.anc_registration_lmp = val === 'true';
          }
          val = $('#anonymous-statistics-content .horizontal-options .selected').attr('data-value');
          if (val) {
            settings.statistics_submission = val;
          }
          UpdateSettings(settings, function(err) {
            $('#setup-wizard-save').removeClass('disabled');
            $('#guided-setup .fa-spinner').hide();
            if (err) {
              console.log('Error updating settings', err);
              $('#guided-setup .error')
                .text(translateFilter('Error saving settings'))
                .show();
              return;
            }
            $('#guided-setup').modal('hide');
          });
        });

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

      Settings(function(err, settings) {
        if (err) {
          return console.log('Error fetching settings', err);
        }
        $scope.enabledLocales = _.reject(settings.locales, function(locale) {
          return !!locale.disabled;
        });
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

        $translate.use(language).then(function() {

          $('#formTypeDropdown, #facilityDropdown').each(function() {
            $(this).multiDropdown({
              label: function(state, callback) {
                if (state.selected.length === 0 || state.selected.length === state.total.length) {
                  return callback(translateFilter(state.menu.data('label-no-filter')));
                }
                if (state.selected.length === 1) {
                  return callback(state.selected.first().text());
                }
                callback(translateFilter(
                  state.menu.data('filter-label'), { number: state.selected.length }
                ));
              },
              selectAllLabel: translateFilter('select all'),
              clearLabel: translateFilter('clear')
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
                return callback(translateFilter(state.menu.data('label-no-filter')));
              }
              return callback(parts.join(', '));
            },
            selectAllLabel: translateFilter('select all'),
            clearLabel: translateFilter('clear')
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
              applyLabel: translateFilter('Apply'),
              cancelLabel: translateFilter('Cancel'),
              fromLabel: translateFilter('date.from'),
              toLabel: translateFilter('date.to'),
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

        });
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
          DeleteMessage(deleteMessageId, function(err) {
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
      $scope.updateFacilityShow = function () {
        var val = '';
        if ($scope.selected && 
            $scope.selected.related_entities && 
            $scope.selected.related_entities.clinic) {
          val = $scope.selected.related_entities.clinic._id;
        }
        $('#update-facility [name=facility]').select2('val', val);
        $('#update-facility').modal('show');
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

        // stop bootstrap closing the search pane on click
        $('.filters .mobile-freetext-filter .search-pane').on('click', function(e) {
          e.stopPropagation();
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
    }
  ]);

  require('./messages');
  require('./messages-content');
  require('./reports');
  require('./reports-content');
  require('./analytics');
  require('./configuration');
  require('./edit-language');
  require('./delete-language');
  require('./edit-translation');
  require('./import-translation');
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
  require('./help');
  require('./help-search');
  require('./theme');

}());
