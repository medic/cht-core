var _ = require('underscore'),
    libphonenumber = require('libphonenumber/utils'),
    phoneRegex = /^\d+$/;

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationSettingsBasicCtrl',
    ['$scope', '$timeout', 'translateFilter', 'Settings', 'UpdateSettings',
    function ($scope, $timeout, translateFilter, Settings, UpdateSettings) {

      var validateCountryCode = function() {
        var countryCode = $scope.basicSettingsModel.default_country_code;
        var countryCodeField = translateFilter('Default country code');

        // required field
        if (!countryCode) {
          $scope.basicSettingsModel.error.default_country_code = translateFilter(
            'field is required', { field: countryCodeField }
          );
          return false;
        }

        // must be all digits
        if (!phoneRegex.test(countryCode)) {
          $scope.basicSettingsModel.error.default_country_code = translateFilter(
            'field digits only', { field: countryCodeField }
          );
          return false;
        }

        return true;
      };

      var validateGatewayNumber = function() {
        var gatewayNumber = $scope.basicSettingsModel.gateway_number;
        var gatewayNumberField = translateFilter('Gateway number');

        // required field
        if (!gatewayNumber) {
          $scope.basicSettingsModel.error.gateway_number = translateFilter(
            'field is required', { field: gatewayNumberField }
          );
          return false;
        }

        // must be a valid phone number
        var info = { default_country_code: $scope.basicSettingsModel.default_country_code };
        if (!libphonenumber.validate(info, gatewayNumber)) {
          $scope.basicSettingsModel.error.gateway_number = translateFilter('Phone number not valid');
          return false;
        }

        // normalise value
        $scope.basicSettingsModel.gateway_number = libphonenumber.format(info, gatewayNumber);

        return true;
      };

      var validate = function() {
        return validateCountryCode() && validateGatewayNumber();
      };
      
      $scope.submitBasicSettings = function() {
        $scope.basicSettingsModel.error = {};
        if (validate()) {
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
        }
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
        $scope.enabledLocales = _.reject(res.locales, function(locale) {
          return !!locale.disabled;
        });
      });

    }
  ]);

}());