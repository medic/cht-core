var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditUserCtrl',
    function (
      $log,
      $q,
      $rootScope,
      $scope,
      $translate,
      $uibModalInstance,
      $window,
      DB,
      model,
      PLACE_TYPES,
      Search,
      Select2Search,
      Session,
      SetLanguage,
      UpdateUser,
      UserSettings
    ) {
      'ngInject';

      $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
      };

      DB()
        .query('medic/doc_by_type', { key: [ 'translations', true ] })
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

      if (model) {
        $scope.editUserModel = {
          id: model._id,
          name: model.name,
          fullname: model.fullname,
          email: model.email,
          phone: model.phone,
          facility: model.facility_id,
          type: getType(model.roles),
          language: { code: model.language },
          contact: model.contact_id
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

      var getSettingsUpdates = function() {
        return {
          name: $scope.editUserModel.name,
          fullname: $scope.editUserModel.fullname,
          email: $scope.editUserModel.email,
          phone: $scope.editUserModel.phone,
          roles: getRoles($scope.editUserModel.type, true),
          language: $scope.editUserModel.language &&
                    $scope.editUserModel.language.code,
          facility_id: $('#edit-user-profile [name=facility]').val(),
          contact_id: $('#edit-user-profile [name=contact]').val()
        };
      };

      var getUserUpdates = function() {
        return {
          name: $scope.editUserModel.name,
          password: $scope.editUserModel.password,
          roles: getRoles($scope.editUserModel.type),
          facility_id: $('#edit-user-profile [name=facility]').val()
        };
      };

      var updateComplete = function(pane, err) {
        if (err) {
          pane.done($translate.instant('Error updating user'), err);
          return;
        }
        if ($scope.editUserModel.password) {
          // reload the page so the user can log in with the new password
          $window.location.reload(true);
        }
        $rootScope.$broadcast('UsersUpdated', $scope.editUserModel.id);
        $scope.editUserModel = null;
        $uibModalInstance.close('ok');
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
        if (validateName()) {
          saveEdit('#edit-user-settings', $scope.editUserModel.id, getSettingsUpdates());
        }
      };

      // #edit-user-profile is the admin view, which has additional fields.
      $scope.editUser = function() {
        $scope.errors = {};
        if (validatePassword() && validateName()) {
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
