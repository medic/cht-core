const passwordTester = require('simple-password-tester');
const phoneNumber = require('@medic/phone-number');
const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;
const USERNAME_ALLOWED_CHARS = /^[a-z0-9_-]+$/;
const ADMIN_ROLE = '_admin';
const FIELDS_TO_IGNORE = [
  'currentPassword',
  'passwordConfirm',
  'facilitySelect',
  'contactSelect',
  'tokenLoginEnabled',
];

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
    FormatDate,
    Languages,
    Select2Search,
    Settings,
    Translate,
    UpdateUser
  ) {
    'use strict';
    'ngInject';

    $scope.cancel = () => $uibModalInstance.dismiss();

    Languages().then(languages => $scope.enabledLocales = languages);

    const getRoles = roles => {
      if (!roles || !roles.length) {
        return [];
      }
      if (roles.indexOf(ADMIN_ROLE) !== -1) {
        return [ ADMIN_ROLE ];
      }
      if (!$scope.roles) {
        // no configured roles
        return [];
      }
      // find all the users roles that are specified in the configuration
      return roles.filter(function(role) {
        return !!$scope.roles[role];
      });
    };

    const allowTokenLogin = settings => settings.token_login && settings.token_login.enabled;

    const determineEditUserModel = function() {
      // Edit a user that's not the current user.
      // $scope.model is the user object passed in by controller creating the Modal.
      // If $scope.model === {}, we're creating a new user.
      return Settings()
        .then(settings => {
          $scope.roles = settings.roles;
          $scope.allowTokenLogin = allowTokenLogin(settings);
          if (!$scope.model) {
            return $q.resolve({});
          }

          const tokenLoginData = $scope.model.token_login;
          const tokenLoginEnabled = tokenLoginData &&
            {
              expirationDate: FormatDate.datetime(tokenLoginData.expiration_date),
              active: tokenLoginData.active,
              loginDate: tokenLoginData.login_date && FormatDate.datetime(tokenLoginData.login_date),
              expired: tokenLoginData.expiration_date <= new Date().getTime(),
            };

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
            roles: getRoles($scope.model.roles),
            // ^ Same with contactSelect vs. contact
            contactSelect: $scope.model.contact_id,
            contact: $scope.model.contact_id,
            tokenLoginEnabled: tokenLoginEnabled,
          });
        });
    };

    this.setupPromise = determineEditUserModel()
      .then(model => {
        $scope.editUserModel = model;
      })
      .catch(err => {
        $log.error('Error determining user model', err);
      });

    $uibModalInstance.rendered
      .then(() => ContactTypes.getAll())
      .then(contactTypes => {
        // only the #edit-user-profile modal has these fields
        const personTypes = contactTypes.filter(type => type.person).map(type => type.id);
        Select2Search($('#edit-user-profile [name=contactSelect]'), personTypes);
        const placeTypes = contactTypes.filter(type => !type.person).map(type => type.id);
        Select2Search($('#edit-user-profile [name=facilitySelect]'), placeTypes);
      });

    const validateRequired = (fieldName, fieldDisplayName) => {
      if (!$scope.editUserModel[fieldName]) {
        Translate.fieldIsRequired(fieldDisplayName)
          .then(function(value) {
            $scope.errors[fieldName] = value;
          });
        return false;
      }
      return true;
    };

    const validateTokenLogin = () => {
      if (!$scope.editUserModel.token_login) {
        return $q.resolve(true);
      }

      return Settings().then(settings => {
        const phone = $scope.editUserModel.phone;
        if (!phoneNumber.validate(settings, phone)) {
          $translate('configuration.enable.token.login.phone').then(value => {
            $scope.errors.phone = value;
          });
          return false;
        }

        // remove assigned password
        $scope.editUserModel.password = '';
        $scope.editUserModel.passwordConfirm = '';

        return true;
      });
    };

    const validatePasswordForEditUser = () => {
      const newUser = !$scope.editUserModel.id;
      const tokenLogin = $scope.editUserModel.token_login;
      if (tokenLogin) {
        // when enabling token_login, password is not required
        return true;
      }

      if (newUser || tokenLogin === false) {
        // for new users or when disabling token_login for users who have it enabled
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

    const validateConfirmPasswordMatches = () => {
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

    const validatePasswordStrength = () => {
      const password = $scope.editUserModel.password || '';
      if (password.length < PASSWORD_MINIMUM_LENGTH) {
        $translate('password.length.minimum', {
          minimum: PASSWORD_MINIMUM_LENGTH,
        }).then(value => {
          $scope.errors.password = value;
        });
        return false;
      }
      if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
        $translate('password.weak').then(value => {
          $scope.errors.password = value;
        });
        return false;
      }
      return true;
    };

    const validatePasswordFields = () => {
      return (
        validateRequired('password', 'Password') &&
        (!$scope.editUserModel.currentPassword ||
          validateRequired('currentPassword', 'Current Password')) &&
        validatePasswordStrength() &&
        validateConfirmPasswordMatches()
      );
    };

    const validateName = () => {
      if ($scope.editUserModel.id) {
        // username is readonly when editing so ignore it
        return true;
      }
      if (!validateRequired('username', 'User Name')) {
        return false;
      }
      if (!USERNAME_ALLOWED_CHARS.test($scope.editUserModel.username)) {
        $translate('username.invalid').then(value => {
          $scope.errors.username = value;
        });
        return false;
      }
      return true;
    };

    const isOnlineUser = (roles) => {
      if (!$scope.roles) {
        return true;
      }
      for (const [name, role] of Object.entries($scope.roles)) {
        if (role.offline && roles.includes(name)) {
          return false;
        }
      }
      return true;
    };

    const validateContactAndFacility = () => {
      const isOnline = isOnlineUser($scope.editUserModel.roles);
      if (isOnline) {
        return !$scope.editUserModel.contact || validateRequired('place', 'Facility');
      }
      const hasPlace = validateRequired('place', 'Facility');
      const hasContact = validateRequired('contact', 'associated.contact');
      return hasPlace && hasContact;
    };

    const validateContactIsInPlace = () => {
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
            $translate('configuration.user.place.contact').then(value => {
              $scope.errors.contact = value;
            });
          }
          return valid;
        })
        .catch(err => {
          $log.error(
            'Error trying to validate contact. Trying to save anyway.',
            err
          );
          return true;
        });
    };

    const validateRole = () => {
      const roles = $scope.editUserModel.roles || [];
      if (!roles.length) {
        Translate.fieldIsRequired('configuration.role')
          .then(function(value) {
            $scope.errors.roles = value;
          });
        return false;
      }
      return true;
    };

    const getUpdatedKeys = (model, existingModel) => {
      return Object.keys(model).filter(key => {
        if (key === 'id') {
          return false;
        }
        if (key === 'password') {
          return model.password && model.password !== '';
        }
        if (key === 'roles') {
          const updated = model.roles ? model.roles.sort() : [];
          const existing = existingModel.roles ? existingModel.roles.sort() : [];
          if (updated.length !== existing.length) {
            return true;
          }
          return !updated.every((role, i) => role === existing[i]);
        }
        if (FIELDS_TO_IGNORE.includes(key)) {
          // We don't want to return these 'meta' fields
          return false;
        }

        return existingModel[key] !== model[key];
      });
    };

    const changedUpdates = model => {
      return determineEditUserModel()
        .then(existingModel => {
          const updates = {};
          getUpdatedKeys(model, existingModel).forEach(key => {
            updates[key] = model[key];
          });

          return updates;
        });
    };

    let previousQuery;
    const validateReplicationLimit = () => {
      const isOnline = isOnlineUser($scope.editUserModel.roles);
      if (isOnline) {
        return $q.resolve();
      }

      const query = {
        role: $scope.editUserModel.roles,
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
              params: { total_docs: resp.data.warn_docs, limit: resp.data.limit },
              severity: 'warning'
            });
          }

          previousQuery = null;
        });
    };

    const computeFields = () => {
      $scope.editUserModel.place = $(
        '#edit-user-profile [name=facilitySelect]'
      ).val();
      $scope.editUserModel.contact = $(
        '#edit-user-profile [name=contactSelect]'
      ).val();
    };

    const haveUpdates = updates => Object.keys(updates).length;

    const validateEmailAddress = () => {
      if (!$scope.editUserModel.email){
        return true;
      }

      if (!isEmailValid($scope.editUserModel.email)){
        $translate('email.invalid').then(value => $scope.errors.email = value);
        return false;
      }

      return true;
    };

    const isEmailValid = email => email.match(/.+@.+/);

    const updateUser = () => {
      return changedUpdates($scope.editUserModel)
        .then(updates => {
          if (!haveUpdates(updates)) {
            return;
          }

          if ($scope.editUserModel.id) {
            return UpdateUser($scope.editUserModel.username, updates);
          }

          return CreateUser.createSingleUser(updates);
        })
        .then(() => {
          $scope.setFinished();
          // TODO: change this from a broadcast to a changes watcher
          //       https://github.com/medic/medic/issues/4094
          $rootScope.$broadcast(
            'UsersUpdated',
            $scope.editUserModel.id
          );
          $uibModalInstance.close();
        })
        .catch(err => {
          if (err && err.data && err.data.error && err.data.error.translationKey) {
            $translate(err.data.error.translationKey, err.data.error.translationParams).then(function(value) {
              $scope.setError(err, value);
            });
          } else {
            $scope.setError(err, 'Error updating user');
          }
        });
    };

    $scope.toggleRole = (role) => {
      const index = $scope.editUserModel.roles.indexOf(role);
      if (index === -1) {
        $scope.editUserModel.roles.push(role);
      } else {
        $scope.editUserModel.roles.splice(index, 1);
      }
    };

    // #edit-user-profile is the admin view, which has additional fields.
    $scope.editUser = () => {
      $scope.setProcessing();
      $scope.errors = {};
      computeFields();

      const synchronousValidations = validateName() &&
                                     validateRole() &&
                                     validateContactAndFacility() &&
                                     validatePasswordForEditUser() &&
                                     validateEmailAddress();

      if (!synchronousValidations) {
        $scope.setError();
        return;
      }

      const asynchronousValidations = $q
        .all([
          validateContactIsInPlace(),
          validateTokenLogin(),
        ])
        .then(responses => responses.every(response => response));

      return asynchronousValidations
        .then(valid => {
          if (!valid) {
            $scope.setError();
            return;
          }

          return validateReplicationLimit().then(() => updateUser());
        })
        .catch(err => {
          if (err.key) {
            $translate(err.key, err.params).then(value => $scope.setError(err, value, err.severity));
          } else {
            $scope.setError(err, 'Error validating user');
          }
        });

    };
  });

