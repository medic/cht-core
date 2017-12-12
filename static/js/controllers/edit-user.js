var passwordTester = require('simple-password-tester'),
    PASSWORD_MINIMUM_LENGTH = 8,
    PASSWORD_MINIMUM_SCORE = 50,
    USERNAME_WHITELIST = /^[a-z0-9_-]+$/;

(function () {

  'use strict';

  // TODO : too many input possibilities, and two different templates. Refactor.
  // https://github.com/medic/medic-webapp/issues/3436
  angular.module('inboxControllers').controller('EditUserCtrl',
    function (
      $log,
      $rootScope,
      $scope,
      $uibModalInstance,
      $q,
      $window,
      ContactSchema,
      CreateUser,
      Languages,
      Select2Search,
      Session,
      SetLanguage,
      Translate,
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

      var getType = function(roles) {
        if (roles && roles.length) {
          return roles[0];
        }
      };

      var determineEditUserModel = function() {
        if ($scope.model) {
          // Edit a user that's not the current user.
          // $scope.model is the user object passed in by controller creating the Modal.
          // If $scope.model === {}, we're creating a new user.
          return $q.resolve({
            id: $scope.model._id,
            username: $scope.model.name,
            fullname: $scope.model.fullname,
            email: $scope.model.email,
            phone: $scope.model.phone,
            // FacilitySelect is what binds to the select, place is there to
            // compare to later to see if it's changed once we've run computeFields();
            facilitySelect: $scope.model.facility_id,
            place: $scope.model.facility_id,
            type: getType($scope.model.roles),
            language: { code: $scope.model.language },
            // ^ Same with contactSelect vs. contact
            contactSelect: $scope.model.contact_id,
            contact: $scope.model.contact_id
          });
        } else {
          // Edit the current user.
          // Could be full edit, or editPassword only.
          return UserSettings()
            .then(function(user) {
              if (user) {
                return {
                  id: user._id,
                  username: user.name,
                  fullname: user.fullname,
                  email: user.email,
                  phone: user.phone,
                  language: { code: user.language }
                };
              }
            })
            .catch(function(err) {
              $log.error('Error fetching user settings', err);
            });
        }
      };

      determineEditUserModel().then(function(model) {
        $scope.editUserModel = model;
      });

      $uibModalInstance.rendered.then(function() {
        // only the #edit-user-profile modal has these fields
        Select2Search($('#edit-user-profile [name=contactSelect]'), 'person');
        Select2Search($('#edit-user-profile [name=facilitySelect]'), ContactSchema.getPlaceTypes());
      });

      var validateRequired = function(fieldName, fieldDisplayName) {
        if (!$scope.editUserModel[fieldName]) {
          Translate(fieldDisplayName)
            .then(function(field) {
              return Translate('field is required', { field: field });
            })
            .then(function(value) {
              $scope.errors[fieldName] = value;
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
          Translate('Passwords must match').then(function(value) {
            $scope.errors.password = value;
          });
          return false;
        }
        return true;
      };

      var validatePasswordStrength = function() {
        var password = $scope.editUserModel.password || '';
        if (password.length < PASSWORD_MINIMUM_LENGTH) {
          Translate('password.length.minimum', { minimum: PASSWORD_MINIMUM_LENGTH }).then(function(value) {
            $scope.errors.password = value;
          });
          return false;
        }
        if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
          Translate('password.weak').then(function(value) {
            $scope.errors.password = value;
          });
          return false;
        }
        return true;
      };

      var validatePasswordFields = function() {
        return validateRequired('password', 'Password') &&
          (!$scope.editUserModel.currentPassword || validateRequired('currentPassword', 'Current Password')) &&
          validatePasswordStrength() &&
          validateConfirmPasswordMatches();
      };

      var validateName = function() {
        if ($scope.editUserModel.id) {
          // username is readonly when editing so ignore it
          return true;
        }
        if (!validateRequired('username', 'User Name')) {
          return false;
        }
        if (!USERNAME_WHITELIST.test($scope.editUserModel.username)) {
          Translate('username.invalid').then(function(value) {
            $scope.errors.username = value;
          });
          return false;
        }
        return true;
      };

      var validateContactAndFacility = function() {
        if ($scope.editUserModel.type !== 'district-manager') {
          return true;
        }
        var hasPlace = validateRequired('place', 'Facility');
        var hasContact = validateRequired('contact', 'associated.contact');
        return hasPlace && hasContact;
      };

      var validateRole = function() {
        return validateRequired('type', 'User Type');
      };

      var changedUpdates = function(model) {
        return determineEditUserModel()
          .then(function(existingModel) {
            var dk = Object.keys(model).filter(function(k) {
              if (k === 'id') {
                return false;
              }
              if (k === 'language') {
                return existingModel[k].code !== (model[k] && model[k].code);
              }
              if (k === 'password') {
                return model[k] && model[k] !== '';
              }
              if (['currentPassword', 'passwordConfirm', 'facilitySelect', 'contactSelect'].indexOf(k) !== -1) {
                // We don't want to return these 'meta' fields
                return false;
              }

              return existingModel[k] !== model[k];
            });

            var updates = {};
            dk.forEach(function(k) {
              updates[k] = model[k];
            });

            return updates;
          });
      };

      var computeFields = function() {
        // $scope.editUserModel.roles = getRoles($scope.editUserModel.type, true);
        $scope.editUserModel.place = $('#edit-user-profile [name=facilitySelect]').val();
        $scope.editUserModel.contact = $('#edit-user-profile [name=contactSelect]').val();
      };

      // Submit function if template is update_password.html
      $scope.updatePassword = function() {
        $scope.errors = {};
        $scope.setProcessing();
        if (validatePasswordFields()) {
          var updates = { password: $scope.editUserModel.password };
          var username = $scope.editUserModel.username;
          UpdateUser(username, updates, username, $scope.editUserModel.currentPassword)
            .then(function() {
              $scope.setFinished();
              $window.location.reload(true);
            })
            .catch(function(err) {
              if (err.status === 401) {
                Translate('password.incorrect').then(function(value) {
                  $scope.errors.currentPassword = value;
                  $scope.setError();
                });
              } else {
                $scope.setError(err, 'Error updating user');
              }
            });
        } else {
          $scope.setError();
        }
      };

      var haveUpdates = function(updates) {
        return Object.keys(updates).length;
      };

      // #edit-user-settings is the limited set of edits that any user can do to itself.
      $scope.editUserSettings = function() {
        $scope.setProcessing();
        $scope.errors = {};
        computeFields();

        if (validateName()) {
          changedUpdates($scope.editUserModel).then(function(updates) {
            $q.resolve().then(function() {
              if (haveUpdates(updates)) {
                return UpdateUser($scope.editUserModel.username, updates)
              }
            })
              .then(function() {
                if (updates.language) {
                  // editing current user, so update language
                  SetLanguage(updates.language);
                }
                $scope.setFinished();
                $uibModalInstance.close();
              })
              .catch(function(err) {
                $scope.setError(err, 'Error updating user');
              });
          });
        } else {
          $scope.setError();
        }
      };

      // #edit-user-profile is the admin view, which has additional fields.
      $scope.editUser = function() {
        $scope.setProcessing();
        $scope.errors = {};
        computeFields();
        if (validateName() &&
            validateRole() &&
            validateContactAndFacility() &&
            validatePasswordForEditUser()) {
          changedUpdates($scope.editUserModel).then(function(updates) {
            $q.resolve().then(function() {
              if (!haveUpdates(updates)) {
                return;
              } else if ($scope.editUserModel.id) {
                return UpdateUser($scope.editUserModel.username, updates);
              } else {
                return CreateUser(updates);
              }
            })
              .then(function() {
                $scope.setFinished();
                // REVIEWER: Why do I need to do this? Shouldn't this be caught by the changes feed?
                $rootScope.$broadcast('UsersUpdated', $scope.editUserModel.id);
                $uibModalInstance.close();
              })
              .catch(function(err) {
                $scope.setError(err, 'Error updating user');
              });
          });
        } else {
          $scope.setError();
        }
      };
    }
  );

}());
