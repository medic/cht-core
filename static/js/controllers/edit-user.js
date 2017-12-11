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
      Languages,
      Select2Search,
      Session,
      SetLanguage,
      Translate,
      UpdateUser,
      UpdateUserV2,
      UserSettings
    ) {
      'ngInject';

      $scope.cancel = function() {
        $uibModalInstance.dismiss();
      };

      Languages().then(function(languages) {
        $scope.enabledLocales = languages;
      });

      // TODO: refactor this into somewhere shared (it's in the api as well!)
      // var rolesMap = {
      //   'national-manager': ['kujua_user', 'data_entry', 'national_admin'],
      //   'district-manager': ['kujua_user', 'data_entry', 'district_admin'],
      //   'facility-manager': ['kujua_user', 'data_entry'],
      //   'data-entry': ['data_entry'],
      //   'analytics': ['kujua_analytics'],
      //   'gateway': ['kujua_gateway']
      // };

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
            name: $scope.model.name,
            fullname: $scope.model.fullname,
            email: $scope.model.email,
            phone: $scope.model.phone,
            facility: $scope.model.facility_id,
            type: getType($scope.model.roles),
            language: { code: $scope.model.language },
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
                  name: user.name,
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
        Select2Search($('#edit-user-profile [name=contact]'), 'person');
        Select2Search($('#edit-user-profile [name=facility]'), ContactSchema.getPlaceTypes());
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
          validateRequired('currentPassword', 'Current Password') &&
          validatePasswordStrength() &&
          validateConfirmPasswordMatches();
      };

      var validateName = function() {
        if ($scope.editUserModel.id) {
          // username is readonly when editing so ignore it
          return true;
        }
        if (!validateRequired('name', 'User Name')) {
          return false;
        }
        if (!USERNAME_WHITELIST.test($scope.editUserModel.name)) {
          Translate('username.invalid').then(function(value) {
            $scope.errors.name = value;
          });
          return false;
        }
        return true;
      };

      var validateContactAndFacility = function() {
        if ($scope.editUserModel.type !== 'district-manager') {
          return true;
        }
        var hasFacility = validateRequired('facility_id', 'Facility');
        var hasContact = validateRequired('contact_id', 'associated.contact');
        return hasFacility && hasContact;
      };

      var validateRole = function() {
        return validateRequired('type', 'User Type');
      };

      // var getRoles = function(type, includeAdmin) {
      //   if (includeAdmin && type === '_admin') {
      //     return ['_admin'];
      //   }
      //   if (!type || !rolesMap[type]) {
      //     return [];
      //   }
      //   // create a new array with the type first, by convention
      //   return [type].concat(rolesMap[type]);
      // };
      //
      //

            // id: $scope.model._id,
            // name: $scope.model.name,
            // fullname: $scope.model.fullname,
            // email: $scope.model.email,
            // phone: $scope.model.phone,
            // facility: $scope.model.facility_id,
            // type: getType($scope.model.roles),
            // language: { code: $scope.model.language },
            // contact: $scope.model.contact_id

      var extractUpdates = function() {
        return {
          name: $scope.editUserModel.name,
          fullname: $scope.editUserModel.fullname,
          email: $scope.editUserModel.email,
          phone: $scope.editUserModel.phone,
          facility: $('#edit-user-profile [name=facility]').val(),
          type: $scope.editUserModel.type,
          language: $scope.editUserModel.language &&
                    $scope.editUserModel.language.code,
          contact: $('#edit-user-profile [name=contact]').val(),
          password: $scope.editUserModel.password
        };
      };

      var changedUpdates = function(model) {
        return determineEditUserModel()
          .then(function(existingModel) {
            var dk = Object.keys(model).filter(function(k) {
              if (k === 'id') {
                // This shouldn't exist, but just in case ignore it
                return false;
              }
              if (k === 'language') {
                return existingModel[k].code !== (model[k] && model[k].code);
              }
              if (k === 'password') {
                return model[k] && model[k] !== '';
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

      // var getSettingsUpdates = function(updatingSelf) {
      //   var settings = {
      //     name: $scope.editUserModel.name,
      //     fullname: $scope.editUserModel.fullname,
      //     email: $scope.editUserModel.email,
      //     phone: $scope.editUserModel.phone,
      //     language: $scope.editUserModel.language &&
      //               $scope.editUserModel.language.code
      //   };
      //   if (!updatingSelf) {
      //     // users don't have permission to update their own security settings
      //     settings.type = $scope.editUserModel.type;
      //     settings.facility_id = $scope.editUserModel.facility_id;
      //     settings.contact_id = $scope.editUserModel.contact_id;
      //   }
      //   return settings;
      // };

      // var getUserUpdates = function() {
      //   var updates = {
      //     name: $scope.editUserModel.name,
      //     // roles: getRoles($scope.editUserModel.type),
      //     type: $scope.editUserModel.type,
      //     facility_id: $scope.editUserModel.facility_id
      //   };

      //   if ($scope.editUserModel.password) {
      //     updates.password = $scope.editUserModel.password;
      //   }

      //   return updates;
      // };

      var computeFields = function() {
        // $scope.editUserModel.roles = getRoles($scope.editUserModel.type, true);
        $scope.editUserModel.facility_id = $('#edit-user-profile [name=facility]').val();
        $scope.editUserModel.contact_id = $('#edit-user-profile [name=contact]').val();
      };

      // TODODODODODODODODODODODODODODODO
      //
      // Convert the $scope'd functions to calls that just care about
      // validation, then sending to a new user service that just pushes to the
      // api service.
      //
      // If you are changing your own password you need to connect to the
      // service via Basic Auth.


      /**
       * Remove org.couchdb.user: from the front of an identifier
       *
       * @param      {String}  id      The identifier
       * @return     {String} Raw name without the prepend.
       */
      var nameFromId = function(id) {
        return id.replace(/^org.couchdb.user:/, '');
      };

      // Submit function if template is update_password.html
      $scope.updatePassword = function() {
        $scope.errors = {};
        $scope.setProcessing();
        if (validatePasswordFields()) {
          var updates = { password: $scope.editUserModel.password };
          var username = nameFromId($scope.editUserModel.id);
          UpdateUserV2(username, updates, username, $scope.editUserModel.currentPassword)
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

      // #edit-user-settings is the limited set of edits that any user can do to itself.
      $scope.editUserSettings = function() {
        $scope.setProcessing();
        $scope.errors = {};
        computeFields();

        if (validateName()) {
          changedUpdates($scope.editUserModel).then(function(updates) {
            UpdateUserV2(nameFromId($scope.editUserModel.id), updates)
              .then(function() {
                $scope.setFinished();
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
