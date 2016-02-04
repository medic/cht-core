var _ = require('underscore'),
    libphonenumber = require('libphonenumber/utils'),
    countries = require('../modules/countries');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationSettingsBasicCtrl',
    ['$scope', '$timeout', 'translateFilter', 'SettingsP', 'UpdateSettings',
    function ($scope, $timeout, translateFilter, SettingsP, UpdateSettings) {

      var validateCountryCode = function() {
        var countryCode = $('#default-country-code').val();

        // required field
        if (!countryCode) {
          var countryCodeField = translateFilter('Default country code');
          $scope.basicSettingsModel.error.default_country_code = translateFilter(
            'field is required', { field: countryCodeField }
          );
          return false;
        }

        return true;
      };

      var validateGatewayNumber = function() {
        var gatewayNumber = $scope.basicSettingsModel.gateway_number;

        // required field
        if (!gatewayNumber) {
          var gatewayNumberField = translateFilter('Gateway number');
          $scope.basicSettingsModel.error.gateway_number = translateFilter(
            'field is required', { field: gatewayNumberField }
          );
          return false;
        }

        // must be a valid phone number
        var info = { default_country_code: $('#default-country-code').val() };
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
          var settings = {
            locale: $scope.basicSettingsModel.locale,
            locale_outgoing: $scope.basicSettingsModel.locale_outgoing,
            gateway_number: $scope.basicSettingsModel.gateway_number,
            default_country_code: $('#default-country-code').val()
          };
          UpdateSettings(settings, function(err) {
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

      SettingsP()
        .then(function(res) {
          $scope.basicSettingsModel = {
            locale: res.locale,
            locale_outgoing: res.locale_outgoing,
            gateway_number: res.gateway_number
          };
          $scope.enabledLocales = _.reject(res.locales, function(locale) {
            return !!locale.disabled;
          });
          $('#default-country-code').select2({ width: '20em', data: countries.list });
          $('#default-country-code').select2('val', res.default_country_code);
        })
        .catch(function(err) {
          console.log('Error loading settings', err);
        });

    }
  ]);

}());
