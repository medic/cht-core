/**
* Our wrapper around google's libphonenumber.
*/
var phonenumber = require('libphonenumber/libphonenumber'),
    standardFormat = phonenumber.PhoneNumberFormat.E164;

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
      return this.util.isPossibleNumber(this.parse()) &&
        // Disallow alpha numbers, e.g. 1-800-MICROSOFT. We only take digits.
        // Disallow weirdness in liphonenumber : 1 or 2 letters are ignored 
        // ('<validnumber>aa' is valid).
        !this.phone.match(/[a-z]/i);
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
