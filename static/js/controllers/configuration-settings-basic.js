(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationSettingsBasicCtrl',
    ['$scope', '$timeout', 'translateFilter', 'Settings', 'UpdateSettings',
    function ($scope, $timeout, translateFilter, Settings, UpdateSettings) {
      
      $scope.submitBasicSettings = function() {
        $scope.status = { loading: true };
        UpdateSettings($scope.basicSettingsModel, function(err) {
          if (err) {
            console.log('Error updating settings', err);
            $scope.status = { error: true, msg: translateFilter('Error saving settings') };
          } else {
            $scope.status = { success: true, msg: translateFilter('Saved') };
            $timeout(function() {
              if ($scope.status) {
                $scope.status.success = false;
              }
            }, 3000);
          }
        });
      };

      Settings(function(err, res) {
        if (err) {
          return console.log('Error loading settings', err);
        }
        $scope.basicSettingsModel = {
          locale: res.locale,
          locale_outgoing: res.locale_outgoing,
          gateway_number: res.gateway_number,
          default_country_code: res.default_country_code
        };
        $scope.locales = res.locales;
      });

    }
  ]);

}());