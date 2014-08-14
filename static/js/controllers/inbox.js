var _ = require('underscore'),
    utils = require('kujua-utils'),
    reporting = require('kujua-reporting/shows'),
    sendMessage = require('./send-message');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl', 
    ['$scope', '$route', '$location', '$translate', '$animate', '$timeout', 'db', 'Facility', 'Settings', 'Form', 'Contact', 'Language', 'ReadMessages', 'MarkRead', 'Verified', 'DeleteMessage', 'UpdateFacility', 'UpdateUser', 'SendMessage', 'User', 'UserDistrict', 'UserCtxService', 'RememberService', 'GenerateSearchQuery', 'DownloadUrl', 'Search',
    function ($scope, $route, $location, $translate, $animate, $timeout, db, Facility, Settings, Form, Contact, Language, ReadMessages, MarkRead, Verified, DeleteMessage, UpdateFacility, UpdateUser, SendMessage, User, UserDistrict, UserCtxService, RememberService, GenerateSearchQuery, DownloadUrl, Search) {

      $scope.forms = [];
      $scope.facilities = [];
      $scope.selected = undefined;
      $scope.loading = true;
      $scope.error = false;
      $scope.appending = false;
      $scope.messages = [];
      $scope.totalMessages = undefined;
      $scope.filterQuery = undefined;
      $scope.filterSimple = true;
      $scope.languages = [];
      $scope.editUserModel = {};

      $scope.permissions = {
        admin: utils.isUserAdmin(UserCtxService()),
        districtAdmin: utils.isUserDistrictAdmin(UserCtxService()),
        district: undefined
      };

      $scope.readStatus = {
        forms: { total: 0, read: 0 },
        messages: { total: 0, read: 0 }
      };

      $scope.filterModel = {
        type: 'messages',
        forms: [],
        facilities: [],
        valid: true,
        messageTypes: [{ type: 'messageincoming' }],
        date: {
          from: moment().subtract(1, 'months').valueOf(),
          to: moment().valueOf()
        }
      };

      $scope.downloadUrl = DownloadUrl($scope.filterModel.type);

      UserDistrict().then(function(res) {
        if (res.error) {
          console.log(res.error);
          if (!$scope.permissions.admin) {
            if (res.error.indexOf('Returned status code') === -1) {
              $('body').html(res.error);
            }
            return;
          }
        }
        $scope.permissions.district = $scope.permissions.admin ? undefined : res.district;
        updateAvailableFacilities();
        updateContacts();
        updateReadStatus();
        $scope.$watch('filterModel', function() {
          $scope.query();
        }, true);
      });

      // TODO we should eliminate the need for this function as much as possible
      var angularApply = function(callback) {
        var scope = angular.element($('body')).scope();
        if (scope) {
          scope.$apply(callback);
        }
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

      var updateAvailableFacilities = function() {
        Facility($scope.permissions.district).then(
          function(res) {
            $scope.facilities = res;
            $('#update-facility [name=facility]').select2();
          },
          function() {
            console.log('Failed to retrieve facilities');
          }
        );
      };

      Form().then(
        function(res) {
          $scope.forms = res;
        },
        function() {
          console.log('Failed to retrieve facilities');
        }
      );

      Settings.query(function(res) {
        if (res.settings) {
          $scope.languages = res.settings.locales;
        }
      });

      Language().then(
        function(language) {
          $translate.use(language);
        },
        function() {
          console.log('Failed to retrieve language');
        }
      );

      var updateReadStatus = function () {
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

      var disableModal = function(modal) {
        modal.find('.submit').text('Updating...');
        modal.find('.btn, [name]').attr('disabled', true);
      };

      var enableModal = function(modal, description, err) {
        var message = '';
        if (err) {
          console.log(description, err);
          message = description + ': ' + err;
        } else {
          modal.modal('hide');
        }
        modal.find('.modal-footer .note').text(message);
        modal.find('.submit').text('Submit');
        modal.find('.btn, [name]').attr('disabled', false);
      };

      $scope.setMessage = function(id) {
        var path = [ $scope.filterModel.type ];
        if (id) {
          path.push(id);
        }
        $location.path(path.join('/'));
      };

      $scope.selectMessage = function(id) {
        if ($scope.selected && $scope.selected._id === id) {
          return;
        }
        _selectedDoc = id;
        if (id) {
          $scope.selected = undefined;
          $scope.messages.forEach(function(message) {
            if (message._id === id) {
              if (!$scope.isRead(message)) {
                var type = message.form ? 'forms' : 'messages';
                $scope.readStatus[type].read++;
                MarkRead(id, true, function(err) {
                  if (err) {
                    console.log(err);
                  }
                });
              }
              $scope.selected = message;
            }
          });
          window.setTimeout(function() {
            $('body').addClass('show-content');
          }, 1);
        } else {
          window.setTimeout(function() {
            $('body').removeClass('show-content');
          }, 1);
          if (!$('#back').is(':visible')) {
            $scope.selected = undefined;
          }
        }
      };

      var _deleteMessage = function(message) {
        if ($scope.selected && $scope.selected._id === message.id) {
          $scope.selected = undefined;
        }
        for (var i = 0; i < $scope.messages.length; i++) {
          if (message.id === $scope.messages[i]._id) {
            $scope.messages.splice(i, 1);
            return;
          }
        }
      };

      $scope.update = function(updated) {
        _.each(updated, function(newMsg) {
          var oldMsg = _.findWhere($scope.messages, { _id: newMsg._id });
          if (oldMsg) {
            if (newMsg._rev !== oldMsg._rev) {
              for (var prop in newMsg) {
                if (newMsg.hasOwnProperty(prop)) {
                  oldMsg[prop] = newMsg[prop];
                }
              }
            }
          } else {
            $scope.messages.push(newMsg);
          }
        });
      };

      $scope.isRead = function(message) {
        if ($scope.selected && $scope.selected._id === message._id) {
          return true;
        }
        return _.contains(message.read, UserCtxService().name);
      };

      var _currentQuery;
      var _selectedDoc;

      $scope.query = function(options) {
        options = options || {};
        if ($scope.filterModel.type === 'analytics') {
          // no search available for analytics
          return;
        }
        options.query = GenerateSearchQuery($scope, options);
        if (options.query === _currentQuery && !options.changes) {
          // debounce as same query already running
          return;
        }
        _currentQuery = options.query;
        $animate.enabled(!!options.changes);
        if (options.changes) {
          updateReadStatus();
          var deletedRows = _.where(options.changes.results, {deleted: true});
          _.each(deletedRows, _deleteMessage);
          if (deletedRows.length === options.changes.results.length) {
            // nothing to update
            return;
          }
        }
        if (!options.silent) {
          $scope.error = false;
          $scope.loading = true;
        }
        if (options.skip) {
          $scope.appending = true;
          options.skip = $scope.messages.length;
        } else if (!options.silent) {
          $scope.messages = [];
        }

        Search(options, function(err, data) {
          _currentQuery = null;
          $scope.loading = false;
          $scope.appending = false;
          if ($scope.filterModel.type === 'analytics') {
            // no search available for analytics
            return;
          }
          if (err) {
            $scope.error = true;
            console.log('Error loading messages', err);
          } else {
            $scope.error = false;
            $scope.update(data.results);
            if (!options.changes) {
              $scope.totalMessages = data.total_rows;
            }
            if (_selectedDoc) {
              $scope.selectMessage(_selectedDoc);
            }
            $('.inbox-items')
              .off('scroll', _checkScroll)
              .on('scroll', _checkScroll);
          }
        });
      };

      var _checkScroll = function() {
        if (this.scrollHeight - this.scrollTop - 10 < this.clientHeight) {
          _applyFilter({ silent: true, skip: true });
        }
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

      $scope.deleteMessage = function() {
        var $modal = $('#delete-confirm');
        disableModal($modal);
        DeleteMessage($scope.selected._id, function(err) {
          enableModal($modal, 'Error deleting document', err);
        });
      };

      $scope.updateFacility = function() {
        var $modal = $('#update-facility');
        var facilityId = $modal.find('[name=facility]').val();
        if (!facilityId) {
          $modal.find('.modal-footer .note').text('Please select a facility');
          return;
        }
        disableModal($modal);
        UpdateFacility($scope.selected._id, facilityId, function(err) {
          enableModal($modal, 'Error updating facility', err);
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

      sendMessage.init();
      $scope.sendMessage = function() {
        sendMessage.validate(function(recipients, message) {
          var $modal = $('#send-message');
          disableModal($modal);

          SendMessage(recipients, message).then(
            function() {
              enableModal($modal);
            },
            function(err) {
              enableModal($modal, 'Error sending message', err);
            }
          );
        });
      };

      $scope.$watch('filterModel.type', function() { 
        $scope.selected = undefined; 
        if ($scope.filterModel.type === 'analytics') {
          $scope.filterSimple = true;
        } else {
          $scope.downloadUrl = DownloadUrl($scope.filterModel.type);
        }
      });

      db.changes({ filter: 'medic/data_records' }, function(err, data) {
        if (!err && data && data.results) {
          $scope.query({ silent: true, changes: data });
        }
      });

      User.query(function(user) {
        $scope.editUserModel = {
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          language: { code: user.language }
        };
      });
      $scope.editUser = function() {
        var $modal = $('#edit-user-profile');
        disableModal($modal);
        UpdateUser({
          fullname: $scope.editUserModel.fullname,
          email: $scope.editUserModel.email,
          phone: $scope.editUserModel.phone,
          language: $scope.editUserModel.language.code
        }, function(err) {
          enableModal($modal, 'Error updating user', err);
        });
      };

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

      $('#messageTypeDropdown').on('update', function() {
        var types = $(this).multiDropdown().val();
        angularApply(function(scope) {
          scope.filterModel.messageTypes = types;
        });
      });

      $('#date-filter').daterangepicker({
        startDate: moment($scope.filterModel.date.from),
        endDate: moment($scope.filterModel.date.to),
        maxDate: moment(),
        applyClass: 'btn-primary',
        cancelClass: 'btn-link'
      },
      function(start, end) {
        angularApply(function(scope) {
          scope.filterModel.date.from = start.valueOf();
          scope.filterModel.date.to = end.valueOf();
        });
      })
      .on('dateSelected.daterangepicker', function(e, picker) {
        if ($('#back').is(':visible')) {
          // mobile version - only show one calendar at a time
          if (picker.container.is('.show-from')) {
            picker.container.removeClass('show-from').addClass('show-to');
          } else {
            picker.container.removeClass('show-to').addClass('show-from');
            picker.hide();
          }
        }
      })
      .on('show.daterangepicker', function(e, picker) {
        if (picker.element.is('.disabled')) {
          picker.hide();
        }
      });
      $('.daterangepicker').addClass('mm-dropdown-menu show-from');

      var _applyFilter = function(options) {
        angularApply(function(scope) {
          scope.query(options || {});
        });
      };

      $('.advanced-filters .btn').on('click', function(e) {
        e.preventDefault();
        _applyFilter();
      });

      $('#advanced').on('keypress', function(e) {
        if (e.which === 13) {
          _applyFilter();
        }
      });

      $('body').on('mouseenter', '.item-content .relative-date', function() {
        if ($(this).data('tooltipLoaded') !== true) {
          $(this).data('tooltipLoaded', true)
            .tooltip({
              placement: 'top',
              trigger: 'manual',
              container: 'body'
            })
            .tooltip('show');
        }
      });
      $('body').on('mouseleave', '.item-content .relative-date', function() {
        if ($(this).data('tooltipLoaded') === true) {
          $(this).data('tooltipLoaded', false)
            .tooltip('hide');
        }
      });

      require('./manage-session').init();
      require('./add-record').init();
    }
  ]);

  inboxControllers.controller('MessagesCtrl', 
    ['$scope', '$route',
    function ($scope, $route) {
      $scope.filterModel.type = 'messages';
      $scope.selectMessage($route.current.params.doc);
    }
  ]);


  inboxControllers.controller('ReportsCtrl', 
    ['$scope', '$route', 
    function ($scope, $route) {
      $scope.filterModel.type = 'reports';
      $scope.selectMessage($route.current.params.doc);
    }
  ]);


  inboxControllers.controller('AnalyticsCtrl', 
    ['$scope',
    function ($scope) {
      $scope.filterModel.type = 'analytics';
      $scope.selectMessage();
      reporting.render_page();
    }
  ]);

}());