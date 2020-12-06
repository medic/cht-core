const passwordTester = require('simple-password-tester');
const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;

(function () {

  'use strict';

  // TODO : too many input possibilities, and two different templates. Refactor.
  // https://github.com/medic/medic/issues/3436
  angular.module('inboxControllers').controller('EditUserCtrl',
    function (
      $log,
      $q,
      $scope,
      $translate,
      $uibModalInstance,
      $window,
      Languages,
      SetLanguage,
      Translate,
      UpdateUser,
      UserLogin,
      UserSettings,
      Modal
    ) {
      'ngInject';

      const ctrl = this;

      ctrl.cancel = function() {
        $uibModalInstance.dismiss();
      };

      Languages().then(function(languages) {
        ctrl.enabledLocales = languages;
      });

      const determineEditUserModel = function() {
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
          ctrl.editUserModel = model;
        })
        .catch(function(err) {
          $log.error('Error determining user model', err);
        });

      const validateRequired = function(fieldName, fieldDisplayName) {
        if (!ctrl.editUserModel[fieldName]) {
          Translate.fieldIsRequired(fieldDisplayName)
            .then(function(value) {
              ctrl.errors[fieldName] = value;
            })
            .catch(function(err) {
              $log.error(`Error translating field display name '${fieldDisplayName}'`, err);
            });
          return false;
        }
        return true;
      };

      const validateConfirmPasswordMatches = function() {
        if (ctrl.editUserModel.password !== ctrl.editUserModel.passwordConfirm) {
          $translate('Passwords must match').then(function(value) {
            ctrl.errors.password = value;
          });
          return false;
        }
        return true;
      };

      const validatePasswordStrength = function() {
        const password = ctrl.editUserModel.password || '';
        if (password.length < PASSWORD_MINIMUM_LENGTH) {
          $translate('password.length.minimum', { minimum: PASSWORD_MINIMUM_LENGTH }).then(function(value) {
            ctrl.errors.password = value;
          });
          return false;
        }
        if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
          $translate('password.weak').then(function(value) {
            ctrl.errors.password = value;
          });
          return false;
        }
        return true;
      };

      const validatePasswordFields = function() {
        return validateRequired('password', 'Password') &&
          validateRequired('currentPassword', 'Current Password') &&
          validatePasswordStrength() &&
          validateConfirmPasswordMatches();
      };

      const changedUpdates = function(model) {
        return determineEditUserModel()
          .then(function(existingModel) {
            const updates = {};
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

      const computeFields = function() {
        ctrl.editUserModel.place = $('#edit-user-profile [name=facilitySelect]').val();
        ctrl.editUserModel.contact = $('#edit-user-profile [name=contactSelect]').val();
      };

      const getLoginData = function(username, password) {
        return JSON.stringify({
          user: username,
          password: password,
          redirect: '',
          locale: ''
        })
      }; 

      // Submit function if template is update_password.html
      ctrl.updatePassword = function() {
        ctrl.errors = {};
        $scope.setProcessing();
        if (validatePasswordFields()) {
          const password = ctrl.editUserModel.password;
          const updates = { password };
          const username = ctrl.editUserModel.username;
          UpdateUser(username, updates, username, ctrl.editUserModel.currentPassword)
            .then(function() {
              const data = getLoginData(username, password);
              UserLogin(data)
                .then(function(response) {
                  $log.info('User Login Response', response);
                })
                .catch(function(err) {
                  if (err.status === 302) {
                    $scope.setFinished();
                    $uibModalInstance.close();
      
                    Modal({
                      templateUrl: 'templates/modals/updated_password.html',
                      controller: 'UpdatedPasswordCtrl',
                      controllerAs: 'updatedPasswordCtrl'
                    }).catch(() => {}); // modal dismissed is ok
                  } else {
                    $window.location.reload(true);
                  }
                });
            })
            .catch(function(err) {
              if (err.status === -1) { //Offline Status
                $translate('online.action.message').then(function(value) {
                  ctrl.errors.currentPassword = value;
                  $scope.setError();
                });
              } else if (err.status === 401) {
                $translate('password.incorrect').then(function(value) {
                  ctrl.errors.currentPassword = value;
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

      const haveUpdates = function(updates) {
        return Object.keys(updates).length;
      };

      // #edit-user-settings is the limited set of edits that any user can do to itself.
      ctrl.editUserSettings = function() {
        $scope.setProcessing();
        ctrl.errors = {};
        computeFields();

        changedUpdates(ctrl.editUserModel).then(function(updates) {
          $q.resolve().then(function() {
            if (haveUpdates(updates)) {
              return UpdateUser(ctrl.editUserModel.username, updates);
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
