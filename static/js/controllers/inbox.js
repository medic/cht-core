var utils = require('kujua-utils'),
    sendMessage = require('../modules/send-message'),
    modal = require('../modules/modal'),
    _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers', []);

  inboxControllers.controller('InboxCtrl', 
    ['$scope', '$route', '$location', '$translate', '$animate', 'Facility', 'Form', 'Settings', 'Contact', 'Language', 'ReadMessages', 'UpdateUser', 'SendMessage', 'User', 'UserDistrict', 'UserCtxService', 'DownloadUrl', 'Verified', 'DeleteMessage', 'UpdateFacility',
    function ($scope, $route, $location, $translate, $animate, Facility, Form, Settings, Contact, Language, ReadMessages, UpdateUser, SendMessage, User, UserDistrict, UserCtxService, DownloadUrl, Verified, DeleteMessage, UpdateFacility) {

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
      $scope.filterQuery = undefined;
      $scope.analyticsModules = undefined;

      require('../modules/manage-session').init();

      var delayIfMobile = function(callback) {
        if($('#back').is(':visible')) {
          window.setTimeout(callback, 1);
        } else {
          callback();
        }
      };

      $scope.setFilterQuery = function(query) {
        $scope.filterQuery = query;
      };

      $scope.setAnalyticsModules = function(modules) {
        $scope.analyticsModules = modules;
      };

      $scope.setSelectedModule = function(module) {
        $scope.filterModel.module = module;
      };

      $scope.setSelected = function(selected) {
        if (selected) {
          delayIfMobile(function() {
            $('body').addClass('show-content');
            $('#back').removeClass('mm-button-disabled');
          });
          $scope.selected = selected;
        } else {
          delayIfMobile(function() {
            $('body').removeClass('show-content');
            $('#back').addClass('mm-button-disabled');
          });
          if (!$('#back').is(':visible')) {
            $scope.selected = undefined;
          } else {
            var itemList = $('.inbox-items');
            var selectedItem = itemList.find('.selected');
            if (selectedItem.length) {
              itemList.scrollTop(selectedItem.offset().top);
            }
          }
        }
      };

      $scope.setContacts = function(options) {
        $scope.loading = false;
        $animate.enabled(!!options.changes);
        if (options.changes) {
          _.each(options.contacts, function(updated) {
            var match = _.find($scope.contacts, function(existing) {
              return existing.key[1] === updated.key[1];
            });
            if (match) {
              angular.extend(match, updated);
            } else {
              $scope.contacts.push(updated);
            }
          });
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
        districtAdmin: utils.isUserDistrictAdmin(UserCtxService()),
        district: undefined
      };

      $scope.readStatus = {
        forms: { total: 0, read: 0 },
        messages: { total: 0, read: 0 }
      };

      $scope.filterModel = {
        freetext: '',
        type: 'messages',
        forms: [],
        facilities: [],
        valid: true,
        date: { }
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
        var pane = modal.start($('#delete-confirm'));
        DeleteMessage($scope.selected._id, function(err) {
          pane.done('Error deleting document', err);
        });
      };

      $scope.updateFacility = function() {
        var $modal = $('#update-facility');
        var facilityId = $modal.find('[name=facility]').val();
        if (!facilityId) {
          $modal.find('.modal-footer .note').text('Please select a facility');
          return;
        }
        var pane = modal.start($modal);
        UpdateFacility($scope.selected._id, facilityId, function(err) {
          pane.done('Error updating facility', err);
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

      $('body').on('mouseenter', '.relative-date', function() {
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
      $('body').on('mouseleave', '.relative-date', function() {
        if ($(this).data('tooltipLoaded') === true) {
          $(this).data('tooltipLoaded', false)
            .tooltip('hide');
        }
      });

      require('../modules/add-record').init();
    }
  ]);

  require('./messages');
  require('./reports');
  require('./analytics');

}());