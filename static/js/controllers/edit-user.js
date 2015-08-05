var modal = require('../modules/modal');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('EditUserCtrl',
    ['$scope', '$rootScope', 'translateFilter', 'UpdateUser', 'Facility', 'Session',
    function ($scope, $rootScope, translateFilter, UpdateUser, Facility, Session) {

      Facility({ types: [ 'clinic', 'health_center', 'district_hospital' ] }, function(err, facilities) {
        if (err) {
          return console.log('Error fetching factilities', err);
        }
        $scope.facilities = facilities;
      });

      var typeMap = {
        clinic: translateFilter('Clinic'),
        district_hospital: translateFilter('District Hospital'),
        health_center: translateFilter('Health Center')
      };

      var rolesMap = {
        'national-manager': ['kujua_user', 'data_entry', 'national_admin'],
        'district-manager': ['kujua_user', 'data_entry', 'district_admin'],
        'facility-manager': ['kujua_user', 'data_entry'],
        'data-entry': ['data_entry'],
        'analytics': ['kujua_analytics'],
        'gateway': ['kujua_gateway']
      };

      var getType = function(type) {
        return (type === 'admin' || type === 'unknown') ? undefined : type;
      };

      $scope.$on('EditUserInit', function(e, user) {
        if (user) {
          $scope.editUserModel = {
            id: user.id,
            name: user.name,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            facility: user.facility,
            type: getType(user.type),
            language: user.language
          };
        } else {
          $scope.editUserModel = {};
        }
      });

      $scope.typeName = function(facility) {
        return typeMap[facility.type];
      };
      
      var validate = function() {
        $scope.errors = {};
        if (!$scope.editUserModel.name) {
          $scope.errors.name = translateFilter('field is required', {
            field: translateFilter('User Name')
          });
        }
        if (!$scope.editUserModel.id && !$scope.editUserModel.password) {
          $scope.errors.password = translateFilter('field is required', {
            field: translateFilter('Password')
          });
        } else if ($scope.editUserModel.password !== $scope.editUserModel.passwordConfirm) {
          $scope.errors.password = translateFilter('Passwords must match');
        }
        return !Object.keys($scope.errors).length;
      };

      var getRoles = function(type) {
        // create a new array with the type first, by convention
        return type ? [type].concat(rolesMap[type]) : [];
      };

      $scope.editUser = function() {
        if (validate()) {
          var pane = modal.start($('#edit-user-profile'));
          var language = $scope.editUserModel.language && $scope.editUserModel.language.code;
          if (language && Session.userCtx().name === $scope.editUserModel.name) {
            // editing current user's language, so update UI
            $scope.changeLanguage(language);
          }
          UpdateUser($scope.editUserModel.id, {
            name: $scope.editUserModel.name,
            fullname: $scope.editUserModel.fullname,
            email: $scope.editUserModel.email,
            phone: $scope.editUserModel.phone,
            language: language,
            password: $scope.editUserModel.password,
            roles: getRoles($scope.editUserModel.type),
            facility_id: $scope.editUserModel.facility &&
                         $scope.editUserModel.facility._id
          }, function(err) {
            if (!err) {
              $rootScope.$broadcast('UsersUpdated', $scope.editUserModel.id);
              $scope.editUserModel = null;
            }
            pane.done(translateFilter('Error updating user'), err);
          });
        }
      };

    }
  ]);

}());