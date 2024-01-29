const phoneNumber = require('@medic/phone-number');
const countries = require('../modules/countries');

angular.module('controllers').controller('SmsSettingsCtrl',
  function(
    $log,
    $scope,
    $timeout,
    $translate,
    Settings,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    const validate = () => {
      $scope.model.error = {};

      const morning = $scope.model.schedule_morning_hours * 60 + $scope.model.schedule_morning_minutes;
      const evening = $scope.model.schedule_evening_hours * 60 + $scope.model.schedule_evening_minutes;
      if (morning >= evening) {
        $scope.model.error.messaging_window = $translate.instant('The first time must be earlier than the second time');
        return false;
      }

      const gatewayNumber = $scope.model.gateway_number;

      if (gatewayNumber) {
        // must be a valid phone number
        const info = { 
          default_country_code: $('#default-country-code').val(),
          phone_validation: 'none'
        };
        
        if (!phoneNumber.validate(info, gatewayNumber)) {
          $scope.model.error.gateway_number = $translate.instant('Phone number not valid');
          return false;
        }

        // normalise value
        $scope.model.gateway_number = phoneNumber.normalize(info, gatewayNumber);
      }

      return true;
    };

    const generateTimeModels = (max, increment=1) => {
      const result = [];
      for (let i = 0; i < max; i += increment) {
        result.push({
          name: (i < 10 ? '0' : '') + i,
          value: i
        });
      }
      return result;
    };

    $scope.submit = () => {
      $scope.model.error = {};
      if (validate()) {
        const settings = {
          gateway_number: $scope.model.gateway_number,
          default_country_code: $('#default-country-code').val(),
          forms_only_mode: !$scope.model.accept_messages,
          schedule_morning_hours: $scope.model.schedule_morning_hours,
          schedule_morning_minutes: $scope.model.schedule_morning_minutes,
          schedule_evening_hours: $scope.model.schedule_evening_hours,
          schedule_evening_minutes: $scope.model.schedule_evening_minutes,
          outgoing_phone_replace: {
            match: $('#outgoing-phone-replace-match').val(),
            replace: $scope.model.outgoing_phone_replace.replace
          }
        };
        $scope.status = { loading: true };
        UpdateSettings(settings)
          .then(() => {
            $scope.status = { success: true, msg: $translate.instant('Saved') };
            $timeout(() => {
              if ($scope.status) {
                $scope.status.success = false;
              }
            }, 3000);
          })
          .catch(err => {
            $log.error('Error updating settings', err);
            $scope.status = { error: true, msg: $translate.instant('Error saving settings') };
          });
      }
    };

    Settings()
      .then(res => {
        $scope.model = {
          gateway_number: res.gateway_number,
          schedule_morning_hours: res.schedule_morning_hours,
          schedule_morning_minutes: res.schedule_morning_minutes,
          schedule_evening_hours: res.schedule_evening_hours,
          schedule_evening_minutes: res.schedule_evening_minutes,
          outgoing_phone_replace: res.outgoing_phone_replace || {},
          accept_messages: !res.forms_only_mode,
        };
        $('#default-country-code').select2({ width: '20em', data: countries.list });
        $('#default-country-code').val(res.default_country_code).trigger('change');
        $scope.hours = generateTimeModels(24);
        $scope.minutes = generateTimeModels(60, 5);
        $('#outgoing-phone-replace-match').select2({
          width: '20em',
          data: countries.list,
          placeholder: ' ',
          allowClear: true
        });
        if (res.outgoing_phone_replace.match) {
          $('#outgoing-phone-replace-match').val(res.outgoing_phone_replace.match).trigger('change');
        }
      })
      .catch(err => $log.error('Error loading settings', err));

  });
