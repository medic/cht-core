(function () {

  'use strict';

  // TODO : too many input possibilities, and two different templates. Refactor.
  // https://github.com/medic/medic-webapp/issues/3436
  angular.module('inboxControllers').controller('EditUserCtrl',
    function (
      $log,
      $rootScope,
      $scope,
      $translate,
      $uibModalInstance,
      $window,
      ContactSchema,
      Languages,
      Select2Search,
      Session,
      SetLanguage,
      UpdateUser,
      UserSettings
    ) {
      'ngInject';

      $scope.cancel = function() {
        $uibModalInstance.dismiss();
      };

      Languages().then(function(languages) {
        $scope.enabledLocales = languages;
      });

      var rolesMap = {
        'national-manager': ['kujua_user', 'data_entry', 'national_admin'],
        'district-manager': ['kujua_user', 'data_entry', 'district_admin'],
        'facility-manager': ['kujua_user', 'data_entry'],
        'data-entry': ['data_entry'],
        'analytics': ['kujua_analytics'],
        'gateway': ['kujua_gateway']
      };

      var getType = function(roles) {
        if (roles && roles.length) {
          return roles[0];
        }
      };

      if ($scope.model) {
        // Edit a user that's not the current user.
        // $scope.model is the user object passed in by controller creating the Modal.
        // If $scope.model === {}, we're creating a new user.
        $scope.editUserModel = {
          id: $scope.model._id,
          name: $scope.model.name,
          fullname: $scope.model.fullname,
          email: $scope.model.email,
          phone: $scope.model.phone,
          facility: $scope.model.facility_id,
          type: getType($scope.model.roles),
          language: { code: $scope.model.language },
          contact: $scope.model.contact_id
        };
      } else {
        // Edit the current user.
        // Could be full edit, or editPassword only.
        $scope.editUserModel = {};

        UserSettings()
          .then(function(user) {
            if (user) {
              $scope.editUserModel.id = user._id;
              $scope.editUserModel.name = user.name;
              $scope.editUserModel.fullname = user.fullname;
              $scope.editUserModel.email = user.email;
              $scope.editUserModel.phone = user.phone;
              $scope.editUserModel.language = { code: user.language };
            }
          })
          .catch(function(err) {
            $log.error('Error fetching user settings', err);
          });

      }

      $uibModalInstance.rendered.then(function() {
        // only the #edit-user-profile modal has these fields
        Select2Search($('#edit-user-profile [name=contact]'), 'person');
        Select2Search($('#edit-user-profile [name=facility]'), ContactSchema.getPlaceTypes());
      });

      var validateRequired = function(fieldName, fieldDisplayName) {
        if (!$scope.editUserModel[fieldName]) {
          $scope.errors[fieldName] = $translate.instant('field is required', {
            field: $translate.instant(fieldDisplayName)
          });
          return false;
        }
        return true;
      };

      var validatePasswordForEditUser = function() {
        var newUser = !$scope.editUserModel.id;
        if (newUser) {
          return validatePasswordFields();
        }

        // if existing user : needs both fields, or none
        if ($scope.editUserModel.password || $scope.editUserModel.passwordConfirm) {
          return validatePasswordFields();
        }
        return true;
      };

      var validateConfirmPasswordMatches = function() {
        if ($scope.editUserModel.password !== $scope.editUserModel.passwordConfirm) {
          $scope.errors.password = $translate.instant('Passwords must match');
          return false;
        }
        return true;
      };

      var validatePasswordFields = function() {
        return validateRequired('password', 'Password') &&
          validateConfirmPasswordMatches();
      };

      var validateName = function() {
        return validateRequired('name', 'User Name');
      };

      var validateContactAndFacility = function() {
        if ($scope.editUserModel.type !== 'district-manager') {
          return true;
        }
        var hasFacility = validateRequired('facility_id', 'Facility');
        var hasContact = validateRequired('contact_id', 'associated.contact');
        return hasFacility && hasContact;
      };

      var getRoles = function(type, includeAdmin) {
        if (includeAdmin && type === '_admin') {
          return ['_admin'];
        }
        if (!type || !rolesMap[type]) {
          return [];
        }
        // create a new array with the type first, by convention
        return [type].concat(rolesMap[type]);
      };

      var getSettingsUpdates = function(updatingSelf) {
        var settings = {
          name: $scope.editUserModel.name,
          fullname: $scope.editUserModel.fullname,
          email: $scope.editUserModel.email,
          phone: $scope.editUserModel.phone,
          language: $scope.editUserModel.language &&
                    $scope.editUserModel.language.code
        };
        if (!updatingSelf) {
          // users don't have permission to update their own security settings
          settings.roles = $scope.editUserModel.roles;
          settings.facility_id = $scope.editUserModel.facility_id;
          settings.contact_id = $scope.editUserModel.contact_id;
        }
        return settings;
      };

      var getUserUpdates = function() {
        return {
          name: $scope.editUserModel.name,
          password: $scope.editUserModel.password,
          roles: getRoles($scope.editUserModel.type),
          facility_id: $('#edit-user-profile [name=facility]').val()
        };
      };

      var computeFields = function() {
        $scope.editUserModel.roles = getRoles($scope.editUserModel.type, true);
        $scope.editUserModel.facility_id = $('#edit-user-profile [name=facility]').val();
        $scope.editUserModel.contact_id = $('#edit-user-profile [name=contact]').val();
      };

      // Submit function if template is update_password.html
      $scope.updatePassword = function() {
        $scope.errors = {};
        $scope.setProcessing();
        if (validatePasswordFields()) {
          var updates = { password: $scope.editUserModel.password };
          UpdateUser($scope.editUserModel.id, null, updates)
            .then(function() {
              $scope.setFinished();
              $window.location.reload(true);
            })
            .catch(function(err) {
              $scope.setError(err, 'Error updating user');
            });
        } else {
          $scope.setError();
        }
      };

      // #edit-user-settings is the limited set of edits that any user can do to itself.
      $scope.editUserSettings = function() {
        $scope.setProcessing();
        $scope.errors = {};
        computeFields();
        if (validateName()) {
          saveEdit('#edit-user-settings', $scope.editUserModel.id, getSettingsUpdates(true));
        } else {
          $scope.setError();
        }
      };

      // #edit-user-profile is the admin view, which has additional fields.
      $scope.editUser = function() {
        $scope.setProcessing();
        $scope.errors = {};
        computeFields();
        if (validatePasswordForEditUser() && validateName() && validateContactAndFacility()) {
          saveEdit('#edit-user-profile', $scope.editUserModel.id, getSettingsUpdates(false), getUserUpdates());
        } else {
          $scope.setError();
        }
      };

      var saveEdit = function(modalId, userId, settingsUpdates, userUpdates) {
        // TODO : Bad API, refactor it, which will allow simpler code in this file.
        // https://github.com/medic/medic-webapp/issues/3441
        UpdateUser(userId, settingsUpdates, userUpdates)
          .then(function() {
            if (settingsUpdates.language && Session.userCtx().name === settingsUpdates.name) {
              // editing current user, so update language
              SetLanguage(settingsUpdates.language);
            }
            $scope.setFinished();
            $rootScope.$broadcast('UsersUpdated', $scope.editUserModel.id);
            $uibModalInstance.close();
          })
          .catch(function(err) {
            $scope.setError(err, 'Error updating user');
          });
      };
    }
  );

}());
