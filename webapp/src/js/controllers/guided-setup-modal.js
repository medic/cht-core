var phoneNumber = require('phone-number'),
    countries = require('../modules/countries');

// TODO convert this controller to use angular more and jquery less
angular.module('inboxControllers').controller('GuidedSetupModalCtrl',
  function(
    $log,
    $scope,
    $translate,
    $uibModalInstance,
    DB,
    Languages,
    Settings,
    UpdateSettings
  ) {

    'ngInject';
    'use strict';

    var validate = function() {
      var countryCode = $('#guided-setup [name=default-country-code]').val();
      var gatewayNumber = $('#guided-setup [name=gateway-number]').val();
      if (gatewayNumber &&
          !phoneNumber.validate({ default_country_code: countryCode }, gatewayNumber)) {
        return {
          valid: false,
          error: 'Phone number not valid'
        };
      }
      return { valid: true };
    };

    $scope.submit = function() {
      $scope.setProcessing();

      var valid = validate();
      if (!valid.valid) {
        $scope.setError(null, valid.error);
        return;
      }

      var settings = {};
      var val;

      val = $('#guided-setup [name=gateway-number]').val();
      if (val) {
        settings.gateway_number = val;
      }
      val = $('#guided-setup [name=default-country-code]').val();
      if (val) {
        settings.default_country_code = val;
      }
      val = $('#primary-contact-content .horizontal-options .selected').attr('data-value');
      if (val) {
        settings.care_coordinator = val;
      }
      val = $('#language-preference-content .locale .selected').attr('data-value');
      if (val) {
        settings.locale = val;
      }
      val = $('#language-preference-content .locale-outgoing .selected').attr('data-value');
      if (val) {
        settings.locale_outgoing = val;
      }
      val = $('#registration-form-content .horizontal-options .selected').attr('data-value');
      if (val) {
        settings.anc_registration_lmp = val === 'true';
      }
      return UpdateSettings(settings)
        .then(function() {
          $scope.setFinished();
          $uibModalInstance.close();
        })
        .catch(function(err) {
          $scope.setError(err, 'Error saving settings');
        });
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    var selectOption = function(e) {
      e.preventDefault();
      var elem = $(this);
      elem.closest('.horizontal-options')
        .find('.selected')
        .removeClass('selected');
      elem.addClass('selected');
      var panel = elem.closest('.panel');
      var label = [];
      panel.find('.horizontal-options .selected').each(function() {
        label.push($(this).text().trim());
      });
      panel
        .addClass('panel-complete')
        .find('.panel-heading .value')
        .text(label.join(', '));
    };

    var updateNumbers = function() {
      var gatewayNumber = $('#guided-setup [name=gateway-number]').val();
      var defaultCountryCode = $('#guided-setup [name=default-country-code]').val();
      var parts = [];
      if (defaultCountryCode) {
        parts.push('+' + defaultCountryCode);
      }
      if (gatewayNumber) {
        parts.push(gatewayNumber);
      }
      $(this).closest('.panel').find('.panel-heading .value').text(parts.join(', '));
      if (gatewayNumber && defaultCountryCode) {
        $(this).closest('.panel').addClass('panel-complete');
      }
    };

    Languages().then(function(languages) {
      $scope.enabledLocales = languages;
      $uibModalInstance.rendered.then(function() {
        $('#guided-setup').on('click', '.horizontal-options a', selectOption);
        $('#guided-setup [name=gateway-number]').on('input', updateNumbers);
        $('#guided-setup [name=default-country-code]').select2({ width: '20em', data: countries.list });
        $('#guided-setup [name=default-country-code]').on('change', updateNumbers);
        Settings()
          .then(function(res) {
            if (res.setup_complete) {
              setTimeout(function() {
                $('#guided-setup [name=default-country-code]').val(res.default_country_code).change();
                $('#guided-setup [name=gateway-number]').val(res.gateway_number).trigger('input');
                $('#primary-contact-content a[data-value=' + res.care_coordinator + ']').trigger('click');
                $('#language-preference-content .locale a[data-value="' + res.locale + '"]').trigger('click');
                $('#language-preference-content .locale-outgoing a[data-value="' + res.locale_outgoing + '"]').trigger('click');
                $('#registration-form-content a[data-value=' + res.anc_registration_lmp + ']').trigger('click');
              });
            }
          })
          .catch(function(err) {
            $log.error('Error fetching settings', err);
          });
      });
    });

  }
);
