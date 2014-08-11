var _ = require('underscore'),
    session = require('session'),
    utils = require('kujua-utils'),
    sms_utils = require('kujua-sms/utils'),
    reporting = require('kujua-reporting/shows'),
    sendMessage = require('./send-message');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl', 
    ['$scope', '$route', '$location', '$translate', '$animate', 'db', 'Facility', 'Settings', 'Form', 'Contact', 'Language', 'ReadMessages', 'MarkRead', 'Verified', 'DeleteMessage', 'UpdateFacility', 'UpdateUser', 'SendMessage', 'User', 'UserDistrict', 'UserCtxService', 'RememberService', 'GenerateSearchQuery',
    function ($scope, $route, $location, $translate, $animate, db, Facility, Settings, Form, Contact, Language, ReadMessages, MarkRead, Verified, DeleteMessage, UpdateFacility, UpdateUser, SendMessage, User, UserDistrict, UserCtxService, RememberService, GenerateSearchQuery) {

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
        if (res.settings && res.settings.reported_date_format) {
          RememberService.dateFormat = res.settings.reported_date_format;
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

      var _deleteMessage = function(id) {
        if ($scope.selected && $scope.selected._id === id) {
          $scope.selected = undefined;
        }
        for (var i = 0; i < $scope.messages.length; i++) {
          if (id === $scope.messages[i]._id) {
            $scope.messages.splice(i, 1);
            return;
          }
        }
      };

      var _findMessage = function(id) {
        for (var i = 0; i < $scope.messages.length; i++) {
          if (id === $scope.messages[i]._id) {
            return $scope.messages[i];
          }
        }
      };

      $scope.update = function(updated) {
        for (var i = 0; i < updated.length; i++) {
          var newMsg = updated[i];
          var oldMsg = _findMessage(newMsg._id);
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
        }
      };

      $scope.isRead = function(message) {
        message.read = message.read || [];
        if ($scope.selected && $scope.selected._id === message._id) {
          return true;
        }
        var user = UserCtxService().name;
        for (var i = 0; i < message.read.length; i++) {
          if (message.read[i] === user) {
            return true;
          }
        }
        return false;
      };

      var _currentQuery;
      var _selectedDoc;

      $scope.query = function(options) {
        options = options || {};
        if ($scope.filterModel.type === 'analytics') {
          // no search available for analytics
          return;
        }
        options.query = GenerateSearchQuery($scope);
        if (options.query === _currentQuery && !options.changes) {
          // debounce as same query already running
          return;
        }
        _currentQuery = options.query;
        $animate.enabled(!!options.changes);
        if (options.changes) {
          updateReadStatus();
          var changedRows = options.changes.results;
          for (var i = changedRows.length - 1; i >= 0; i--) {
            if (changedRows[i].deleted) {
              _deleteMessage(changedRows[i].id);
              changedRows.splice(i, 1);
            }
          }
          if (!changedRows.length) {
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

        if ($scope.permissions.districtAdmin) {
            options.query += ' AND district:' + $scope.permissions.district;
        }

        if (options.changes && options.changes.results.length) {
            var updatedIds = _.map(options.changes.results, function(result) {
                return '"' + result.id + '"';
            });
            options.query += ' AND uuid:(' + updatedIds.join(' OR ') + ')';
        }
        db.getFTI(
          'medic',
          'data_records',
          {
            limit: 50,
            q: options.query,
            skip: options.skip || 0,
            sort: '\\reported_date',
            include_docs: true
          },
          function(err, data) {
            _currentQuery = null;
            if ($scope.filterModel.type === 'analytics') {
              // no search available for analytics
              return;
            }
            angularApply(function($scope) {
              $scope.loading = false;
              if (err) {
                $scope.error = true;
                console.log('Error loading messages', err);
              } else {
                $scope.error = false;
                data.rows = _.map(data.rows, function(row) {
                  return sms_utils.makeDataRecordReadable(row.doc, sms_utils.info);
                });
                $scope.update(data.rows);
                if (!options.changes) {
                  $scope.totalMessages = data.total_rows;
                }
                if (_selectedDoc) {
                  $scope.selectMessage(_selectedDoc);
                }
              }
              $scope.appending = false;
            });
          }
        );
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
        }
      });

      db.changes({
        include_docs: true,
        filter: 'medic/data_records'
      }, function(err, data) {
        if (!err && data && data.results) {
          $scope.query({ silent: true, changes: data });
        }
      });

      User.query(function(user) {
        // TODO bind these to scope
        $('#edit-user-profile #fullname').val(user.fullname);
        $('#edit-user-profile #email').val(user.email);
        $('#edit-user-profile #phone').val(user.phone);
        $('#edit-user-profile #language').val(user.language);
      });
      $scope.editUser = function() {
        var $modal = $('#edit-user-profile');
        disableModal($modal);
        UpdateUser({
          fullname: $modal.find('#fullname').val(),
          email: $modal.find('#email').val(),
          phone: $modal.find('#phone').val(),
          language: $modal.find('#language').val()
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

      var iframe = $('#add-record-panel iframe');
      var src = iframe.data('src');
      $.ajax({
        type: 'head',
        url: src,
        success: function() {
          var btn = $('#send-record-button');
          btn.closest('li').removeClass('disabled');
          btn.on('click', function(e) {
            e.preventDefault();
            $('#add-record-panel .dropdown-menu').toggle();
            if (!iframe.attr('src')) {
              iframe.attr('src', src);
            }
          });
          $('#add-record-panel .close').on('click', function() {
            $('#add-record-panel .dropdown-menu').toggle();
          });
        }
      });

      $('body').on('click', '.send-message', function(e) {
        e.preventDefault();
        var to = $(e.target).closest('.send-message').attr('data-send-to');
        var $modal = $('#send-message');
        var val = [];
        if (to) {
          var options = $modal.find('[name=phone]').data('options');
          var doc = _.find(options, function(option) {
            return option.doc.contact && option.doc.contact.phone === to;
          });
          if (doc) {
            val.push(doc);
          }
        }
        $modal.find('[name=phone]').select2('data', val);
        $modal.find('[name=message]').val('');
        $modal.modal('show');
      });

      $('#update-facility-btn').on('click', function(e) {
        e.preventDefault();
        angularApply(function(scope) {
          var val = '';
          if (scope.selected && 
            scope.selected.related_entities && 
            scope.selected.related_entities.clinic) {
            val = scope.selected.related_entities.clinic._id;
          }
          $('#update-facility [name=facility]').select2('val', val);
        });
        $('#update-facility').modal('show');
      });


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

      var itemPanel = $('.inbox-items');
      itemPanel.on('scroll', function () {
        if (this.scrollHeight - this.scrollTop - 10 < this.clientHeight) {
          _applyFilter({
            silent: true,
            skip: true
          });
        }
      });

      $('#download').on('click', function(e) {
        if ($('#download').find('.mm-button.disabled').length) {
          e.preventDefault();
          return;
        }
        angularApply(function(scope) {
          var url = $('html').data('base-url');
          var type = scope.filterModel.type === 'message' ? 'messages' : 'forms';
          url += '/export/' + type;
          var params = {
            startkey: '[9999999999999,{}]',
            endkey: '[0]',
            tz: moment().zone(),
            format: 'xml',
            reduce: false
          };
          url += '?' + $.param(params);
          $('#download').attr('href', url);
        });
      });

      $('#send-message [name=message]').on('keyup', function(e) {
        var target = $(e.target);
        var count = target.val().length;
        var msg = '';
        if (count > 50) {
            msg = count + '/160 characters';
        }
        target.closest('.modal-content').find('.modal-footer .note').text(msg);
      });


      var redirectToLogin = function() {
        window.location = '/dashboard/_design/dashboard/_rewrite/login' +
          '?redirect=' + window.location;
      };
      $('#logout').on('click', function(e) {
        e.preventDefault();
        session.logout(redirectToLogin);
      });
      if ($('html').data('user') && !$('html').data('user').name) {
        redirectToLogin();
      } else {
        session.on('change', function (userCtx) {
          if (!userCtx.name) {
            redirectToLogin();
          }
        });
      }
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