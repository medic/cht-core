var libphonenumber = require('libphonenumber/utils'),
    countries = require('../modules/countries');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationSettingsBasicCtrl',
    function (
      $log,
      $scope,
      $timeout,
      Settings,
      translateFilter,
      UpdateSettings
    ) {

      'ngInject';

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
          UpdateSettings(settings)
            .then(function() {
              $scope.status = { success: true, msg: translateFilter('Saved') };
              $timeout(function() {
                if ($scope.status) {
                  $scope.status.success = false;
                }
              }, 3000);
            })
            .catch(function(err) {
              $log.error('Error updating settings', err);
              $scope.status = { error: true, msg: translateFilter('Error saving settings') };
            });
        }
      };

      Settings()
        .then(function(res) {
          $scope.basicSettingsModel = {
            locale: res.locale,
            locale_outgoing: res.locale_outgoing,
            gateway_number: res.gateway_number
          };
          $('#default-country-code').select2({ width: '20em', data: countries.list });
          $('#default-country-code').val(res.default_country_code).trigger('change');
        })
        .catch(function(err) {
          $log.error('Error loading settings', err);
        });

    }
  );

}());
