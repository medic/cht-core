/**
* Our wrapper around google's libphonenumber.
*/
var phonenumber = require('libphonenumber/libphonenumber'),
    CHARACTER_REGEX = /[a-z]/i;

var _init = function(settings, phone) {
  var instance = phonenumber.PhoneNumberUtil.getInstance();
  var countryCode = settings && settings.default_country_code;
  var regionCode = instance.getRegionCodeForCountryCode(countryCode);
  var parsed = instance.parseAndKeepRawInput(phone, regionCode);

  return {
    format: function(scheme) {
      if (!this.validate()) {
        return false;
      }
      if (typeof scheme === 'undefined') {
        if (parsed.getCountryCode() + '' === countryCode) {
          scheme = phonenumber.PhoneNumberFormat.NATIONAL;
        } else {
          scheme = phonenumber.PhoneNumberFormat.INTERNATIONAL;
        }
      }
      return instance.format(parsed, scheme).toString();
    },
    validate: function() {
      return instance.isValidNumber(parsed) &&
        // Disallow alpha numbers which libphonenumber considers valid,
        // e.g. 1-800-MICROSOFT.
        !phone.match(CHARACTER_REGEX);
    }
  };
};

/**
 * Returns international format if valid number, or false if invalid.
 */
exports.normalize = function(settings, phone) {
  try {
    return _init(settings, phone).format(phonenumber.PhoneNumberFormat.E164);
  } catch (e) {}
  return false;
};

/**
 * Returns the number formatted for display, or false if invalid.
 */
exports.format = function(settings, phone) {
  try {
    return _init(settings, phone).format();
  } catch (e) {}
  return false;
};

/**
 * Returns true if valid number.
 * Allows dots, brackets, spaces, but not letters.
 */
exports.validate = function(settings, phone) {
  try {
    return _init(settings, phone).validate();
  } catch (e) {}
  return false;
};
