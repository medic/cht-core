var libphonenumber = require('libphonenumber/utils');

(function () {

  'use strict';

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
    var gatewayNumber = $('#gateway-number').val();
    var defaultCountryCode = $('#default-country-code').val();
    if (gatewayNumber && defaultCountryCode) {
      $(this).closest('.panel')
        .addClass('panel-complete')
        .find('.panel-heading .value')
        .text(gatewayNumber + ', ' + defaultCountryCode);
    }
  };

  var validate = function(translateFilter) {
    var phoneRegex = /^\d+$/;
    var countryCode = $('#guided-setup [name=default-country-code]').val();
    if (countryCode && !phoneRegex.test(countryCode)) {
      return {
        valid: false,
        error: translateFilter('field digits only', {
          field: translateFilter('Default country code')
        })
      };
    }
    var gatewayNumber = $('#guided-setup [name=gateway-number]').val();
    if (gatewayNumber &&
        !libphonenumber.validate({ default_country_code: countryCode }, gatewayNumber)) {
      return {
        valid: false,
        error: translateFilter('Phone number not valid')
      };
    }
    return { valid: true };
  };

  var save = function(UpdateSettings, translateFilter, e) {
    e.preventDefault();

    var valid = validate(translateFilter);
    if (!valid.valid) {
      $('#guided-setup .error').text(valid.error).show();
      return;
    }

    $('#setup-wizard-save').addClass('disabled');
    $('#guided-setup .fa-spinner').show();
    $('#guided-setup .error').hide();
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
    val = $('#anonymous-statistics-content .horizontal-options .selected').attr('data-value');
    if (val) {
      settings.statistics_submission = val;
    }
    UpdateSettings(settings, function(err) {
      $('#setup-wizard-save').removeClass('disabled');
      $('#guided-setup .fa-spinner').hide();
      if (err) {
        console.log('Error updating settings', err);
        $('#guided-setup .error')
          .text(translateFilter('Error saving settings'))
          .show();
        return;
      }
      $('#guided-setup').modal('hide');
    });
  };

  var bindSettings = function(Settings) {
    Settings(function(err, res) {
      if (err) {
        return console.log('Error fetching settings', err);
      }
      window.setTimeout(function() {
        $('#guided-setup [name=gateway-number]')
          .val(res.gateway_number).trigger('input');
        $('#guided-setup [name=default-country-code]')
          .val(res.default_country_code).trigger('input');
        $('#primary-contact-content a[data-value=' + res.care_coordinator + ']')
          .trigger('click');
        $('#language-preference-content .locale a[data-value=' + res.locale + ']')
          .trigger('click');
        $('#language-preference-content .locale-outgoing a[data-value=' + res.locale_outgoing + ']')
          .trigger('click');
        $('#registration-form-content a[data-value=' + res.anc_registration_lmp + ']')
          .trigger('click');
        $('#anonymous-statistics-content a[data-value=' + res.statistics_submission + ']')
          .trigger('click');
      }, 1);
    });
  };

  exports.init = function(Settings, UpdateSettings, translateFilter) {
    bindSettings(Settings);
    $('#guided-setup').on('click', '.horizontal-options a', selectOption);
    $('#modem-setup-content').on('input', 'input', updateNumbers);
    $('#setup-wizard-save').on('click', function(e) {
      save(UpdateSettings, translateFilter, e);
    });
  };

}());