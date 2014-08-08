var _ = require('underscore'),
    utils = require('kujua-utils'),
    sms_utils = require('kujua-sms/utils'),
    reporting = require('kujua-reporting/shows'),
    sendMessage = require('./send-message');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl', 
    ['$scope', '$route', '$location', '$translate', '$animate', 'db', 'Facility', 'Settings', 'Form', 'Contact', 'Language', 'ReadMessages', 'MarkRead', 'Verified', 'DeleteMessage', 'UpdateFacility', 'UpdateUser', 'SendMessage', 'User', 'UserDistrict', 'UserCtxService', 'RememberService',
    function ($scope, $route, $location, $translate, $animate, db, Facility, Settings, Form, Contact, Language, ReadMessages, MarkRead, Verified, DeleteMessage, UpdateFacility, UpdateUser, SendMessage, User, UserDistrict, UserCtxService, RememberService) {

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

      var enableModal = function(modal, err) {
        if (!err) {
          modal.modal('hide');
        }
        modal.find('.modal-footer .note').text(err || '');  
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
                MarkRead(id, true);
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

      var _getFilterString = function() {

        var formatDate = function(date) {
          return date.zone(0).format('YYYY-MM-DD');
        };

        var filters = [];

        if ($scope.filterSimple) {

          // increment end date so it's inclusive
          var to = moment($scope.filterModel.date.to).add(1, 'days');
          var from = moment($scope.filterModel.date.from);

          filters.push(
            'reported_date<date>:[' + 
            formatDate(from) + ' TO ' + formatDate(to) + 
            ']'
          );

          if ($scope.filterModel.type === 'messages') {

            if ($scope.filterModel.messageTypes.length) {
              var types = [];
              $scope.filterModel.messageTypes.forEach(function(value) {
                var filter = 'type:' + value.type;
                if (value.state) {
                  filter = '(' + filter + ' AND state:' + value.state + ')';
                }
                types.push(filter);
              });
              filters.push('(' + types.join(' OR ') + ')');
            } else {
              filters.push('type:message*');
            }

          } else {

            filters.push('type:report');
            var selectedForms = $scope.filterModel.forms.length;
            if (selectedForms > 0 && selectedForms < $scope.forms.length) {
              var formCodes = [];
              $scope.filterModel.forms.forEach(function(form) {
                formCodes.push(form.code);
              });
              filters.push('form:(' + formCodes.join(' OR ') + ')');
            }
            if ($scope.filterModel.valid === true) {
              filters.push('errors<int>:0');
            } else if ($scope.filterModel.valid === false) {
              filters.push('NOT errors<int>:0');
            }

          }

          var selectedFacilities = $scope.filterModel.facilities.length;
          if (selectedFacilities > 0 && selectedFacilities < $scope.facilities.length) {
            filters.push('clinic:(' + $scope.filterModel.facilities.join(' OR ') + ')');
          }

        } else {

          if ($scope.filterQuery && $scope.filterQuery.trim()) {
            filters.push($scope.filterQuery);
          }
          var type = $scope.filterModel.type === 'messages' ?
            'message*' : 'report';
          filters.push('type:' + type);

        }

        return filters.join(' AND ');
      };

      var _currentQuery;
      var _selectedDoc;

      $scope.query = function(options) {
        options = options || {};
        if ($scope.filterModel.type === 'analytics') {
          // no search available for analytics
          return;
        }
        options.query = _getFilterString();
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
            angular.element($('body')).scope().$apply(function($scope) {
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
          Verified($scope.selected._id, verify);
        }
      };

      $scope.deleteMessage = function() {
        DeleteMessage($scope.selected._id);
        $('#delete-confirm').modal('hide');
      };

      $scope.updateFacility = function() {
        var facilityId = $('#update-facility [name=facility]').val();
        if (!facilityId) {
            $('#update-facility .modal-footer .note').text('Please select a facility');
            return;
        }
        UpdateFacility($scope.selected._id, facilityId);
        $('#update-facility').modal('hide');
      };

      $scope.editUser = function() {
        var $modal = $('#edit-user-profile');
        UpdateUser({
          fullname: $modal.find('#fullname').val(),
          email: $modal.find('#email').val(),
          phone: $modal.find('#phone').val(),
          language: $modal.find('#language').val()
        });
        $modal.modal('hide');
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
              enableModal($modal, err);
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