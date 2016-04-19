/**
* Our wrapper around google's libphonenumber.
*/
var phonenumber = require('libphonenumber/libphonenumber'),
    standardFormat = phonenumber.PhoneNumberFormat.E164,
    CHARACTER_REGEX = /[a-z]/i;

var _init = function(settings, phone) {
  return {
    util: phonenumber.PhoneNumberUtil.getInstance(),
    phone: phone,
    countryCode: settings && settings.default_country_code,
    country: function() {
      return this.util.getRegionCodeForCountryCode(this.countryCode);
    },
    parse: function() {
      return this.util.parseAndKeepRawInput(this.phone, this.country());
    },
    format: function() {
      if (!this.validate()) {
        return false;
      }
      return this.util.format(this.parse(), standardFormat).toString();
    },
    validate: function() {
      return this.util.isValidNumber(this.parse()) &&
        // Disallow alpha numbers which libphonenumber considers valid,
        // e.g. 1-800-MICROSOFT.
        !this.phone.match(CHARACTER_REGEX);
    }
  };
};

/** Returns international format if valid number, false if invalid number. */
exports.format = function(settings, phone) {
  try {
    return _init(settings, phone).format();
  } catch (e) {}
  return false;
};

/** Returns true if valid number. Allows dots, brackets, spaces, but not letters. */
exports.validate = function(settings, phone) {
  try {
    return _init(settings, phone).validate();
  } catch (e) {}
  return false;
};
