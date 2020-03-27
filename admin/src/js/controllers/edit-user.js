const passwordTester = require('simple-password-tester');
const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;
const USERNAME_WHITELIST = /^[a-z0-9_-]+$/;
const ADMIN_ROLE = '_admin';

angular
  .module('controllers')
  .controller('EditUserCtrl', function(
    $http,
    $log,
    $q,
    $rootScope,
    $scope,
    $translate,
    $uibModalInstance,
    ContactTypes,
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

    const getRole = function(roles) {
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
      const knownRoles = roles.filter(function(role) {
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

    const determineEditUserModel = function() {
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

    $uibModalInstance.rendered
      .then(() => ContactTypes.getAll())
      .then(function(contactTypes) {
        // only the #edit-user-profile modal has these fields
        const personTypes = contactTypes.filter(type => type.person).map(type => type.id);
        Select2Search($('#edit-user-profile [name=contactSelect]'), personTypes);
        const placeTypes = contactTypes.filter(type => !type.person).map(type => type.id);
        Select2Search($('#edit-user-profile [name=facilitySelect]'), placeTypes);
      });

    const validateRequired = function(fieldName, fieldDisplayName) {
      if (!$scope.editUserModel[fieldName]) {
        Translate.fieldIsRequired(fieldDisplayName)
          .then(function(value) {
            $scope.errors[fieldName] = value;
          });
        return false;
      }
      return true;
    };

    const validatePasswordForEditUser = function() {
      const newUser = !$scope.editUserModel.id;
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

    const validateConfirmPasswordMatches = function() {
      if (
        $scope.editUserModel.password !== $scope.editUserModel.passwordConfirm
      ) {
        $translate('Passwords must match').then(function(value) {
          $scope.errors.password = value;
        });
        return false;
      }
      return true;
    };

    const validatePasswordStrength = function() {
      const password = $scope.editUserModel.password || '';
      if (password.length < PASSWORD_MINIMUM_LENGTH) {
        $translate('password.length.minimum', {
          minimum: PASSWORD_MINIMUM_LENGTH,
        }).then(function(value) {
          $scope.errors.password = value;
        });
        return false;
      }
      if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
        $translate('password.weak').then(function(value) {
          $scope.errors.password = value;
        });
        return false;
      }
      return true;
    };

    const validatePasswordFields = function() {
      return (
        validateRequired('password', 'Password') &&
        (!$scope.editUserModel.currentPassword ||
          validateRequired('currentPassword', 'Current Password')) &&
        validatePasswordStrength() &&
        validateConfirmPasswordMatches()
      );
    };

    const validateName = function() {
      if ($scope.editUserModel.id) {
        // username is readonly when editing so ignore it
        return true;
      }
      if (!validateRequired('username', 'User Name')) {
        return false;
      }
      if (!USERNAME_WHITELIST.test($scope.editUserModel.username)) {
        $translate('username.invalid').then(function(value) {
          $scope.errors.username = value;
        });
        return false;
      }
      return true;
    };

    const validateContactAndFacility = function() {
      const role = $scope.roles && $scope.roles[$scope.editUserModel.role];
      if (!role || !role.offline) {
        return !$scope.editUserModel.contact || validateRequired('place', 'Facility');
      }
      const hasPlace = validateRequired('place', 'Facility');
      const hasContact = validateRequired('contact', 'associated.contact');
      return hasPlace && hasContact;
    };

    const validateContactIsInPlace = function() {
      const placeId = $scope.editUserModel.place;
      const contactId = $scope.editUserModel.contact;
      if (!placeId || !contactId) {
        return $q.resolve(true);
      }
      return DB()
        .get(contactId)
        .then(function(contact) {
          let parent = contact.parent;
          let valid = false;
          while (parent) {
            if (parent._id === placeId) {
              valid = true;
              break;
            }
            parent = parent.parent;
          }
          if (!valid) {
            $translate('configuration.user.place.contact').then(function(value) {
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

    const validateRole = function() {
      return validateRequired('role', 'configuration.role');
    };

    const changedUpdates = function(model) {
      return determineEditUserModel().then(function(existingModel) {
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

    let previousQuery;
    const validateReplicationLimit = () => {
      const role = $scope.roles && $scope.roles[$scope.editUserModel.role];
      if (!role || !role.offline) {
        return $q.resolve();
      }

      const query = {
        role: $scope.editUserModel.role,
        facility_id: $scope.editUserModel.place,
        contact_id: $scope.editUserModel.contact
      };

      if (previousQuery && JSON.stringify(query) === previousQuery) {
        return $q.resolve();
      }

      previousQuery = JSON.stringify(query);
      return $http
        .get('/api/v1/users-info', { params: query })
        .then(resp => {
          if (resp.data.warn) {
            return $q.reject({
              key: 'configuration.user.replication.limit.exceeded',
              params: { total_docs: resp.data.total_docs, limit: resp.data.limit },
              severity: 'warning'
            });
          }

          previousQuery = null;
        });
    };

    const computeFields = function() {
      $scope.editUserModel.place = $(
        '#edit-user-profile [name=facilitySelect]'
      ).val();
      $scope.editUserModel.contact = $(
        '#edit-user-profile [name=contactSelect]'
      ).val();
    };

    const haveUpdates = function(updates) {
      return Object.keys(updates).length;
    };

    const validateEmailAddress = function(){
      if (!$scope.editUserModel.email){
        return true;
      }

      if (!isEmailValid($scope.editUserModel.email)){
        $translate('email.invalid').then(function(value) {
          $scope.errors.email = value;
        });
        return false;
      }

      return true;
    };

    const isEmailValid = function(email){
      return email.match(/.+@.+/);
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
        validatePasswordForEditUser() &&
        validateEmailAddress()
      ) {
        validateContactIsInPlace()
          .then(function(valid) {
            if (!valid) {
              $scope.setError();
              return;
            }
            return validateReplicationLimit().then(() => {
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
                    //       https://github.com/medic/medic/issues/4094
                    $rootScope.$broadcast(
                      'UsersUpdated',
                      $scope.editUserModel.id
                    );
                    $uibModalInstance.close();
                  })
                  .catch(function(err) {
                    if (err && err.data && err.data.error && err.data.error.translationKey) {
                      $translate(err.data.error.translationKey, err.data.error.translationParams).then(function(value) {
                        $scope.setError(err, value);
                      });
                    } else {
                      $scope.setError(err, 'Error updating user');
                    }
                  });
              });
            });
          })
          .catch(function(err) {
            if (err.key) {
              $translate(err.key, err.params).then(value => $scope.setError(err, value, err.severity));
            } else {
              $scope.setError(err, 'Error validating user');
            }
          });
      } else {
        $scope.setError();
      }
    };
  });
