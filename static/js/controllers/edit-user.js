var passwordTester = require('simple-password-tester'),
    PASSWORD_MINIMUM_LENGTH = 8,
    PASSWORD_MINIMUM_SCORE = 50;

(function () {

  'use strict';

  // TODO : too many input possibilities, and two different templates. Refactor.
  // https://github.com/medic/medic-webapp/issues/3436
  angular.module('inboxControllers').controller('EditUserCtrl',
    function (
      $log,
      $scope,
      $uibModalInstance,
      $q,
      $window,
      Languages,
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

      var determineEditUserModel = function() {
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
            } else {
              return {};
            }
          });
      };

      determineEditUserModel()
        .then(function(model) {
          $scope.editUserModel = model;
        })
        .catch(function(err) {
          $log.error('Error determining user model', err);
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

      var changedUpdates = function(model) {
        return determineEditUserModel()
          .then(function(existingModel) {
            var updates = {};
            Object.keys(model)
              .filter(function(k) {
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
              })
              .forEach(function(k) {
                if (k === 'language') {
                  updates[k] = model[k].code;
                } else {
                  updates[k] = model[k];
                }
              });

            return updates;
          });
      };

      var computeFields = function() {
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
              if (err.status === -1) { //Offline Status
                Translate('online.action.message').then(function(value) {
                  $scope.errors.currentPassword = value;
                  $scope.setError();
                });
              } else if (err.status === 401) {
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

        changedUpdates($scope.editUserModel).then(function(updates) {
          $q.resolve().then(function() {
            if (haveUpdates(updates)) {
              return UpdateUser($scope.editUserModel.username, updates);
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
      };

    }
  );

}());
