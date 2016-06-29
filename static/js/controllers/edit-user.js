var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditUserCtrl',
    function (
      $log,
      $rootScope,
      $scope,
      $translate,
      $window,
      DB,
      Facility,
      Language,
      PLACE_TYPES,
      Session,
      SetLanguage,
      UpdateUser
    ) {
      'ngInject';

      Facility({ types: PLACE_TYPES })
        .then(function(facilities) {
          $scope.facilities = facilities;
        })
        .catch(function(err) {
          $log.error('Error fetching facilities', err);
        });

      var typeMap = {
        clinic: $translate.instant('Clinic'),
        district_hospital: $translate.instant('District Hospital'),
        health_center: $translate.instant('Health Center')
      };

      var rolesMap = {
        'national-manager': ['kujua_user', 'data_entry', 'national_admin'],
        'district-manager': ['kujua_user', 'data_entry', 'district_admin'],
        'facility-manager': ['kujua_user', 'data_entry'],
        'data-entry': ['data_entry'],
        'analytics': ['kujua_analytics'],
        'gateway': ['kujua_gateway']
      };

      var getType = function(type) {
        return type === 'unknown' ? undefined : type;
      };

      $scope.$on('EditUserInit', function(e, user) {
        if (!user) {
          $scope.editUserModel = {};
          return;
        }
        $scope.editUserModel = {
          id: user.id,
          name: user.name,
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          facility: user.facility,
          type: getType(user.type),
          language: user.language
        };
        var $contact = $('#edit-user-profile [name=contact]');
        if (user.contact_id) {
          $contact.empty();
          DB().get(user.contact_id)
            .then(function(contact) {
              $contact
                .append($('<option>', {
                  selected: 'selected',
                  value: contact._id,
                  text: contact.name,
                }))
                .val(contact._id)
                .trigger('change');
            });
        } else {
          $contact
              .val(null)
              .trigger('change');
        }
      });

      $scope.typeName = function(facility) {
        return typeMap[facility.type];
      };

      var validatePassword = function() {
        var newUser = !$scope.editUserModel.id;
        if (newUser) {
          if (!$scope.editUserModel.password) {
            $scope.errors.password = $translate.instant('field is required', {
              field: $translate.instant('Password')
            });
            return false;
          }
        }
        if ($scope.editUserModel.password !== $scope.editUserModel.passwordConfirm) {
          $scope.errors.password = $translate.instant('Passwords must match');
          return false;
        }
        return true;
      };

      var validateUser = function() {
        return validatePassword() && validateName();
      };

      var validateUserSettings = function() {
        return validateName();
      };

      var validateName = function() {
        if (!$scope.editUserModel.name) {
          $scope.errors.name = $translate.instant('field is required', {
            field: $translate.instant('User Name')
          });
          return false;
        }
        return true;
      };

      var getRoles = function(type, includeAdmin) {
        if (includeAdmin && type === 'admin') {
          return ['_admin'];
        }
        if (!type || !rolesMap[type]) {
          return [];
        }
        // create a new array with the type first, by convention
        return [type].concat(rolesMap[type]);
      };

      var getSettingsUpdates = function() {
        return {
          name: $scope.editUserModel.name,
          fullname: $scope.editUserModel.fullname,
          email: $scope.editUserModel.email,
          phone: $scope.editUserModel.phone,
          roles: getRoles($scope.editUserModel.type, true),
          language: $scope.editUserModel.language &&
                    $scope.editUserModel.language.code,
          facility_id: $scope.editUserModel.facility &&
                       $scope.editUserModel.facility._id,
          contact_id: $('#edit-user-profile [name=contact]').val()
        };
      };

      var getUserUpdates = function() {
        return {
          name: $scope.editUserModel.name,
          password: $scope.editUserModel.password,
          roles: getRoles($scope.editUserModel.type),
          facility_id: $scope.editUserModel.facility &&
                       $scope.editUserModel.facility._id
        };
      };

      var updateComplete = function(pane, err) {
        if (!err) {
          if ($scope.editUserModel.password) {
            // reload the page so the user can log in with the new password
            $window.location.reload(true);
          }
          $rootScope.$broadcast('UsersUpdated', $scope.editUserModel.id);
          $scope.editUserModel = null;
        }
        pane.done($translate.instant('Error updating user'), err);
      };

      $scope.updatePassword = function() {
        $scope.errors = {};
        if (validatePassword()) {
          var pane = modal.start($('#update-password'));
          var updates = { password: $scope.editUserModel.password };
          UpdateUser($scope.editUserModel.id, null, updates)
            .then(function() {
              updateComplete(pane);
            })
            .catch(function(err) {
              updateComplete(pane, err);
            });
        }
      };

      // #edit-user-settings is the limited set of edits that any user can do to itself.
      $scope.editUserSettings = function() {
        $scope.errors = {};
        if (validateUserSettings()) {
          saveEdit('#edit-user-settings', $scope.editUserModel.id, getSettingsUpdates());
        }
      };

      // #edit-user-profile is the admin view, which has additional fields.
      $scope.editUser = function() {
        $scope.errors = {};
        if (validateUser()) {
          saveEdit('#edit-user-profile', $scope.editUserModel.id, getSettingsUpdates(), getUserUpdates());
        }
      };

      var saveEdit = function(modalId, userId, settingsUpdates, userUpdates) {
        var pane = modal.start($(modalId));
        UpdateUser(userId, settingsUpdates, userUpdates)
          .then(function() {
            if (settingsUpdates.language && Session.userCtx().name === settingsUpdates.name) {
              // editing current user, so update language
              SetLanguage(settingsUpdates.language);
            }
            updateComplete(pane);
          })
          .catch(function(err) {
            updateComplete(pane, err);
          });
      };
    }
  );

}());
