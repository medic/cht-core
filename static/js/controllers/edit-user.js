var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditUserCtrl',
    ['$rootScope', '$scope', 'DB', 'Facility', 'Session', 'UpdateUser', 'translateFilter', 'PLACE_TYPES',
    function ($rootScope, $scope, DB, Facility, Session, UpdateUser, translateFilter, PLACE_TYPES) {

      Facility({ types: PLACE_TYPES }, function(err, facilities) {
        if (err) {
          return console.log('Error fetching facilities', err);
        }
        $scope.facilities = facilities;
      });

      var typeMap = {
        clinic: translateFilter('Clinic'),
        district_hospital: translateFilter('District Hospital'),
        health_center: translateFilter('Health Center')
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
        return (type === 'admin' || type === 'unknown') ? undefined : type;
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
          DB.get().get(user.contact_id)
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
        $scope.errors = {};
        if (!$scope.editUserModel.id && !$scope.editUserModel.password) {
          $scope.errors.password = translateFilter('field is required', {
            field: translateFilter('Password')
          });
        } else if ($scope.editUserModel.password !== $scope.editUserModel.passwordConfirm) {
          $scope.errors.password = translateFilter('Passwords must match');
        }
        return !Object.keys($scope.errors).length;
      };

      var validate = function() {
        $scope.errors = {};
        validatePassword();
        if (!$scope.editUserModel.name) {
          $scope.errors.name = translateFilter('field is required', {
            field: translateFilter('User Name')
          });
        }
        return !Object.keys($scope.errors).length;
      };

      var getRoles = function(type) {
        // create a new array with the type first, by convention
        return type ? [type].concat(rolesMap[type]) : [];
      };

      var getSettingsUpdates = function() {
        return {
          name: $scope.editUserModel.name,
          fullname: $scope.editUserModel.fullname,
          email: $scope.editUserModel.email,
          phone: $scope.editUserModel.phone,
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
            document.location.reload(true);
          }
          $rootScope.$broadcast('UsersUpdated', $scope.editUserModel.id);
          $scope.editUserModel = null;
        }
        pane.done(translateFilter('Error updating user'), err);
      };

      $scope.updatePassword = function() {
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

      $scope.editUser = function(settingsOnly) {
        if (settingsOnly || validate()) {
          var modalId = settingsOnly ? '#edit-user-settings' : '#edit-user-profile';
          var pane = modal.start($(modalId));
          var settings = getSettingsUpdates();
          var user = settingsOnly ? null : getUserUpdates();
          if (settings.language && Session.userCtx().name === $scope.editUserModel.name) {
            // editing current user's language, so update UI
            $scope.changeLanguage(settings.language);
          }
          UpdateUser($scope.editUserModel.id, settings, user)
            .then(function() {
              updateComplete(pane);
            })
            .catch(function(err) {
              updateComplete(pane, err);
            });
        }
      };

    }
  ]);

}());
