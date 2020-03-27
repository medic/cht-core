const phoneNumber = require('@medic/phone-number');
const countries = require('../modules/countries');

// TODO convert this controller to use angular more and jquery less
angular.module('inboxControllers').controller('GuidedSetupModalCtrl',
  function(
    $log,
    $scope,
    $timeout,
    $uibModalInstance,
    Languages,
    Settings,
    UpdateSettings
  ) {

    'ngInject';
    'use strict';

    const ctrl = this;

    const validate = function() {
      const countryCode = $('#guided-setup [name=default-country-code]').val();
      const gatewayNumber = $('#guided-setup [name=gateway-number]').val();
      if (gatewayNumber &&
          !phoneNumber.validate({ default_country_code: countryCode, phone_validation: 'none' }, gatewayNumber)) {
        return {
          valid: false,
          error: 'Phone number not valid'
        };
      }
      return { valid: true };
    };

    ctrl.submit = function() {
      $scope.setProcessing();

      const valid = validate();
      if (!valid.valid) {
        $scope.setError(null, valid.error);
        return;
      }

      const settings = {};
      let val;

      val = $('#guided-setup [name=gateway-number]').val();
      if (val) {
        // normalise value        
        const info = { 
          default_country_code: $('#guided-setup [name=default-country-code]').val(),
          phone_validation: 'none'
        };
        
        settings.gateway_number = phoneNumber.normalize(info, val);
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

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };

    const selectOption = function(e) {
      e.preventDefault();
      const elem = $(this);
      elem.closest('.horizontal-options')
        .find('.selected')
        .removeClass('selected');
      elem.addClass('selected');
      const panel = elem.closest('.panel');
      const label = [];
      panel.find('.horizontal-options .selected').each(function() {
        label.push($(this).text().trim());
      });
      panel
        .addClass('panel-complete')
        .find('.panel-heading .value')
        .text(label.join(', '));
    };

    const updateNumbers = function() {
      const gatewayNumber = $('#guided-setup [name=gateway-number]').val();
      const defaultCountryCode = $('#guided-setup [name=default-country-code]').val();
      const parts = [];
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
      ctrl.enabledLocales = languages;
      $uibModalInstance.rendered.then(function() {
        $('#guided-setup').on('click', '.horizontal-options a', selectOption);
        $('#guided-setup [name=gateway-number]').on('input', updateNumbers);
        $('#guided-setup [name=default-country-code]').select2({ width: '20em', data: countries.list });
        $('#guided-setup [name=default-country-code]').on('change', updateNumbers);
        Settings()
          .then(function(res) {
            if (res.setup_complete) {
              $timeout(function() {
                $('#guided-setup [name=default-country-code]').val(res.default_country_code).change();
                $('#guided-setup [name=gateway-number]').val(res.gateway_number).trigger('input');
                $('#primary-contact-content a[data-value=' + res.care_coordinator + ']').trigger('click');
                $('#language-preference-content .locale a[data-value="' + res.locale + '"]').trigger('click');
                $('#language-preference-content .locale-outgoing a[data-value="' + res.locale_outgoing + '"]')
                  .trigger('click');
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
