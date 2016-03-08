(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationPermissionsCtrl',
    ['$scope', '$log', 'Settings', 'UpdateSettings',
    function ($scope, $log, Settings, UpdateSettings) {
      $scope.loading = true;
      $scope.roles = [
        {
          name: 'usertype.national-manager',
          value: 'national_admin'
        },
        {
          name: 'usertype.district-manager',
          value: 'district_admin'
        },
        {
          name: 'usertype.data-entry',
          value: 'data_entry'
        },
        {
          name: 'usertype.analytics',
          value: 'analytics'
        },
        {
          name: 'usertype.gateway',
          value: 'gateway'
        }
      ];
      Settings()
        .then(function(settings) {
          $scope.loading = false;
          $scope.permissions = settings.permissions.map(function(permission) {
            var roles = $scope.roles.map(function(role) {
              return {
                name: role.value,
                value: permission.roles.indexOf(role.value) !== -1
              };
            });
            return {
              name: permission.name,
              roles: roles
            };
          });
        })
        .catch(function(err) {
          $log.error('Error fetching settings', err);
          $scope.loading = false;
        });

      var getEnabledRoles = function(roles) {
        return roles
          .filter(function(role) {
            return role.value;
          })
          .map(function(role) {
            return role.name;
          });
      };

      var mapUpdatesToSettings = function(updates) {
        return updates.map(function(updated) {
          return {
            name: updated.name,
            roles: getEnabledRoles(updated.roles)
          };
        });
      };

      $scope.submit = function() {
        var settings = {
          permissions: mapUpdatesToSettings($scope.permissions)
        };
        $scope.submitting = true;
        UpdateSettings(settings, { replace: true }, function(err) {
          $scope.submitting = false;
          if (err) {
            $log.error('Error updating settings', err);
            $scope.error = 'Error saving settings';
          }
        });
      };
    }
  ]);

}());