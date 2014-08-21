var utils = require('kujua-utils'),
    sendMessage = require('../modules/send-message'),
    modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl', 
    ['$scope', '$route', '$location', '$translate', '$animate', '$timeout', 'Facility', 'Form', 'Settings', 'Contact', 'Language', 'ReadMessages', 'UpdateUser', 'SendMessage', 'User', 'UserDistrict', 'UserCtxService', 'DownloadUrl',
    function ($scope, $route, $location, $translate, $animate, $timeout, Facility, Form, Settings, Contact, Language, ReadMessages, UpdateUser, SendMessage, User, UserDistrict, UserCtxService, DownloadUrl) {

      $scope.loading = true;
      $scope.error = false;
      $scope.appending = false;
      $scope.languages = [];
      $scope.editUserModel = {};
      $scope.forms = [];
      $scope.facilities = [];
      $scope.contacts = undefined;
      $scope.messages = undefined;
      $scope.selected = undefined;

      var delayIfMobile = function(callback) {
        if($('#back').is(':visible')) {
          window.setTimeout(callback, 1);
        } else {
          callback();
        }
      };

      $scope.setSelected = function(selected) {
        if (selected) {
          delayIfMobile(function() {
            $('body').addClass('show-content');
          });
          $scope.selected = selected;
        } else {
          delayIfMobile(function() {
            $('body').removeClass('show-content');
          });
          if (!$('#back').is(':visible')) {
            $scope.selected = undefined;
          }
        }
      };

      $scope.setContacts = function(contacts) {
        $animate.enabled(false);
        $scope.loading = false;
        $scope.contacts = contacts;
      };

      $scope.setMessages = function(messages) {
        $scope.loading = false;
        $scope.messages = messages;
      };

      $scope.isRead = function(message) {
        if ($scope.selected && $scope.selected._id === message._id) {
          return true;
        }
        return _.contains(message.read, UserCtxService().name);
      };

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
        date: {
          from: moment().subtract(1, 'months').valueOf(),
          to: moment().valueOf()
        }
      };

      $scope.setMessage = function(id) {
        var path = [ $scope.filterModel.type ];
        if (id) {
          path.push(id);
        }
        $location.path(path.join('/'));
      };

      $scope.messagesDownloadUrl = DownloadUrl(true);
      $scope.reportsDownloadUrl = DownloadUrl(false);

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
        $scope.updateReadStatus();
        sendMessage.init();
      });

      Form().then(
        function(res) {
          $scope.forms = res;
        },
        function() {
          console.log('Failed to retrieve forms');
        }
      );

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

      $scope.sendMessage = function(event) {
        sendMessage.validate(event.target, function(recipients, message) {
          var pane = modal.start($(event.target).closest('.message-form'));
          SendMessage(recipients, message).then(
            function() {
              pane.done();
            },
            function(err) {
              pane.done('Error sending message', err);
            }
          );
        });
      };

      User.query(function(user) {
        $scope.editUserModel = {
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          language: { code: user.language }
        };
      });

      $scope.editUser = function() {
        var pane = modal.start($('#edit-user-profile'));
        UpdateUser({
          fullname: $scope.editUserModel.fullname,
          email: $scope.editUserModel.email,
          phone: $scope.editUserModel.phone,
          language: $scope.editUserModel.language.code
        }, function(err) {
          pane.done('Error updating user', err);
        });
      };

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

      require('../modules/manage-session').init();
      require('../modules/add-record').init();
    }
  ]);

  require('./messages');
  require('./reports');
  require('./analytics');

}());