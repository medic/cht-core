var i18n = require('libphonenumber/phoneformat'),
  standardFormat = i18n.phonenumbers.PhoneNumberFormat.E164;

var _init = function(settings, phone) {
  return {
    util: i18n.phonenumbers.PhoneNumberUtil.getInstance(),
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
        // Disallow alpha numbers, e.g. 1-800-MICROSOFT. We only take digits.
        // Disallow weirdness in liphonenumber : 1 or 2 letters are ignored 
        // ('<validnumber>aa' is valid).
        !this.phone.match(/[a-z]/i);
    }
  };
};

exports.format = function(settings, phone) {
  try {
    return _init(settings, phone).format();
  } catch (e) {}
  return false;
};

exports.validate = function(settings, phone) {
  try {
    return _init(settings, phone).validate();
  } catch (e) {}
  return false;
};