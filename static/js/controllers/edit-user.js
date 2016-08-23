(function () {

  'use strict';

  angular.module('inboxControllers').controller('EditUserCtrl',
    function (
      $log,
      $rootScope,
      $scope,
      $translate,
      $uibModalInstance,
      $window,
      DB,
      PLACE_TYPES,
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

      DB()
        .query('medic-client/doc_by_type', { key: [ 'translations', true ] })
        .then(function(result) {
          $scope.enabledLocales = result.rows.map(function(row) {
            return row.value;
          });
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

      var getType = function(roles) {
        if (roles && roles.length) {
          return roles[0];
        }
      };

      if ($scope.model) {
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
        // get the current user

        UserSettings()
          .then(function(user) {
            if (!user) {
              $scope.editUserModel = {};
              return;
            }
            $scope.editUserModel = {
              id: user._id,
              name: user.name,
              fullname: user.fullname,
              email: user.email,
              phone: user.phone,
              language: { code: user.language }
            };
          })
          .catch(function(err) {
            $log.error('Error fetching user settings', err);
          });

      }

      $uibModalInstance.rendered.then(function() {
        // only the #edit-user-profile modal has these fields
        Select2Search($('#edit-user-profile [name=contact]'), 'person');
        Select2Search($('#edit-user-profile [name=facility]'), PLACE_TYPES);
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
        if ($scope.editUserModel.password &&
            $scope.editUserModel.password !== $scope.editUserModel.passwordConfirm) {
          $scope.errors.password = $translate.instant('Passwords must match');
          return false;
        }
        return true;
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
          settings.roles = getRoles($scope.editUserModel.type, true);
          settings.facility_id = $('#edit-user-profile [name=facility]').val();
          settings.contact_id = $('#edit-user-profile [name=contact]').val();
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

      $scope.updatePassword = function() {
        $scope.errors = {};
        $scope.setProcessing();
        if (validatePassword()) {
          var updates = { password: $scope.editUserModel.password };
          UpdateUser($scope.editUserModel.id, null, updates)
            .then(function() {
              $scope.setFinished();
              $window.location.reload(true);
            })
            .catch(function(err) {
              $scope.setError(err, 'Error updating user');
            });
        }
      };

      // #edit-user-settings is the limited set of edits that any user can do to itself.
      $scope.editUserSettings = function() {
        $scope.setProcessing();
        $scope.errors = {};
        if (validateName()) {
          saveEdit('#edit-user-settings', $scope.editUserModel.id, getSettingsUpdates(true));
        }
      };

      // #edit-user-profile is the admin view, which has additional fields.
      $scope.editUser = function() {
        $scope.setProcessing();
        $scope.errors = {};
        if (validatePassword() && validateName()) {
          saveEdit('#edit-user-profile', $scope.editUserModel.id, getSettingsUpdates(), getUserUpdates());
        }
      };

      var saveEdit = function(modalId, userId, settingsUpdates, userUpdates) {
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
