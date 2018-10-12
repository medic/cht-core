var passwordTester = require('simple-password-tester'),
  PASSWORD_MINIMUM_LENGTH = 8,
  PASSWORD_MINIMUM_SCORE = 50,
  USERNAME_WHITELIST = /^[a-z0-9_-]+$/,
  ADMIN_ROLE = '_admin';

angular
  .module('controllers')
  .controller('EditUserCtrl', function(
    $log,
    $rootScope,
    $scope,
    $uibModalInstance,
    $q,
    ContactSchema,
    CreateUser,
    DB,
    Languages,
    Select2Search,
    Settings,
    Translate,
    UpdateUser
  ) {
    'use strict';
    'ngInject';

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    Languages().then(function(languages) {
      $scope.enabledLocales = languages;
    });

    var getRole = function(roles) {
      if (!roles || !roles.length) {
        return;
      }
      if (roles.indexOf(ADMIN_ROLE) !== -1) {
        return ADMIN_ROLE;
      }
      if (!$scope.roles) {
        // no configured roles
        return;
      }
      // find all the users roles that are specified in the configuration
      var knownRoles = roles.filter(function(role) {
        return !!$scope.roles[role];
      });
      if (knownRoles.length) {
        // Pre 2.16.0 versions stored the role we care about at the end
        // of the roles array so for backwards compatibility return the
        // last element.
        // From 2.16.0 onwards users only have one role.
        return knownRoles[knownRoles.length - 1];
      }
    };

    var determineEditUserModel = function() {
      // Edit a user that's not the current user.
      // $scope.model is the user object passed in by controller creating the Modal.
      // If $scope.model === {}, we're creating a new user.
      if ($scope.model) {
        return Settings().then(function(settings) {
          $scope.roles = settings.roles;
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
            role: getRole($scope.model.roles),
            language: { code: $scope.model.language },
            // ^ Same with contactSelect vs. contact
            contactSelect: $scope.model.contact_id,
            contact: $scope.model.contact_id,
          });
        });
      } else {
        return $q.resolve({});
      }
    };

    determineEditUserModel()
      .then(function(model) {
        $scope.editUserModel = model;
      })
      .catch(function(err) {
        $log.error('Error determining user model', err);
      });

    $uibModalInstance.rendered.then(function() {
      // only the #edit-user-profile modal has these fields
      Select2Search($('#edit-user-profile [name=contactSelect]'), 'person');
      Select2Search(
        $('#edit-user-profile [name=facilitySelect]'),
        ContactSchema.getPlaceTypes()
      );
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
      if (
        $scope.editUserModel.password ||
        $scope.editUserModel.passwordConfirm
      ) {
        return validatePasswordFields();
      }
      return true;
    };

    var validateConfirmPasswordMatches = function() {
      if (
        $scope.editUserModel.password !== $scope.editUserModel.passwordConfirm
      ) {
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
        Translate('password.length.minimum', {
          minimum: PASSWORD_MINIMUM_LENGTH,
        }).then(function(value) {
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
      return (
        validateRequired('password', 'Password') &&
        (!$scope.editUserModel.currentPassword ||
          validateRequired('currentPassword', 'Current Password')) &&
        validatePasswordStrength() &&
        validateConfirmPasswordMatches()
      );
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
      var role = $scope.roles && $scope.roles[$scope.editUserModel.role];
      if (!role || !role.offline) {
        return !$scope.editUserModel.contact || validateRequired('place', 'Facility');
      }
      var hasPlace = validateRequired('place', 'Facility');
      var hasContact = validateRequired('contact', 'associated.contact');
      return hasPlace && hasContact;
    };

    var validateContactIsInPlace = function() {
      var placeId = $scope.editUserModel.place;
      var contactId = $scope.editUserModel.contact;
      if (!placeId || !contactId) {
        return $q.resolve(true);
      }
      return DB()
        .get(contactId)
        .then(function(contact) {
          var parent = contact.parent;
          var valid = false;
          while (parent) {
            if (parent._id === placeId) {
              valid = true;
              break;
            }
            parent = parent.parent;
          }
          if (!valid) {
            Translate('configuration.user.place.contact').then(function(value) {
              $scope.errors.contact = value;
            });
          }
          return valid;
        })
        .catch(function(err) {
          $log.error(
            'Error trying to validate contact. Trying to save anyway.',
            err
          );
          return true;
        });
    };

    var validateRole = function() {
      return validateRequired('role', 'configuration.role');
    };

    var changedUpdates = function(model) {
      return determineEditUserModel().then(function(existingModel) {
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
            if (
              [
                'currentPassword',
                'passwordConfirm',
                'facilitySelect',
                'contactSelect',
              ].indexOf(k) !== -1
            ) {
              // We don't want to return these 'meta' fields
              return false;
            }

            return existingModel[k] !== model[k];
          })
          .forEach(function(k) {
            if (k === 'language') {
              updates[k] = model[k].code;
            } else if (k === 'role') {
              updates.roles = [model[k]];
            } else {
              updates[k] = model[k];
            }
          });

        return updates;
      });
    };

    var computeFields = function() {
      $scope.editUserModel.place = $(
        '#edit-user-profile [name=facilitySelect]'
      ).val();
      $scope.editUserModel.contact = $(
        '#edit-user-profile [name=contactSelect]'
      ).val();
    };

    var haveUpdates = function(updates) {
      return Object.keys(updates).length;
    };

    // #edit-user-profile is the admin view, which has additional fields.
    $scope.editUser = function() {
      $scope.setProcessing();
      $scope.errors = {};
      computeFields();
      if (
        validateName() &&
        validateRole() &&
        validateContactAndFacility() &&
        validatePasswordForEditUser()
      ) {
        validateContactIsInPlace()
          .then(function(valid) {
            if (!valid) {
              $scope.setError();
              return;
            }
            changedUpdates($scope.editUserModel).then(function(updates) {
              $q.resolve()
                .then(function() {
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
                  // TODO: change this from a broadcast to a changes watcher
                  //       https://github.com/medic/medic-webapp/issues/4094
                  $rootScope.$broadcast(
                    'UsersUpdated',
                    $scope.editUserModel.id
                  );
                  $uibModalInstance.close();
                })
                .catch(function(err) {
                  $scope.setError(err, 'Error updating user');
                });
            });
          })
          .catch(function(err) {
            $scope.setError(err, 'Error validating user');
          });
      } else {
        $scope.setError();
      }
    };
  });
