/**
 * @module phone-number
 * @description Our wrapper around google's libphonenumber.
 */
var phonenumber = require('google-libphonenumber'),
    CHARACTER_REGEX = /[a-z]/i;

var _init = function(settings, phone) {
  var instance = phonenumber.PhoneNumberUtil.getInstance();
  var shortInfo = phonenumber.ShortNumberInfo.getInstance();
  var countryCode = settings && settings.default_country_code;
  var regionCode = instance.getRegionCodeForCountryCode(countryCode);
  var parsed = instance.parseAndKeepRawInput(phone, regionCode);
  var validationType = ((settings && settings.phone_validation) || '').toLowerCase();

  function validPhone(){
    if (validationType === 'partial') {
      return instance.isPossibleNumber(parsed);
    }
    if(validationType === 'none') {
      return true;
    }
    return instance.isValidNumber(parsed);
  }

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
      if (shortInfo.isValidShortNumber(parsed)) {
        scheme = phonenumber.PhoneNumberFormat.NATIONAL;
      }
      return instance.format(parsed, scheme).toString();
    },
    validate: function() {
      return validPhone() &&
        // Disallow alpha numbers which libphonenumber considers valid,
        // e.g. 1-800-MICROSOFT.
        !phone.match(CHARACTER_REGEX);
    }
  };
};

/**
 * Returns international format if valid number, or false if invalid.
 * @param {Object} settings The configuration from the db
 * @param {String} phone The phone number to normalize.
 * @returns {(String|Boolean)} The normalized number or false if invalid.
 */
exports.normalize = function(settings, phone) {
  try {
    return _init(settings, phone).format(phonenumber.PhoneNumberFormat.E164);
  } catch (e) {
    // invalid number
  }
  return false;
};

/**
 * Returns the number formatted for display, or false if invalid.
 * @param {Object} settings The configuration from the db
 * @param {String} phone The phone number to normalize.
 * @returns {(String|Boolean)} The formatted number or false if invalid.
 */
exports.format = function(settings, phone) {
  try {
    return _init(settings, phone).format();
  } catch (e) {
    // invalid number
  }
  return false;
};

/**
 * Returns true if valid number.
 * Allows dots, brackets, spaces, but not letters.
 * @param {Object} settings The configuration from the db
 * @param {String} phone The phone number to normalize.
 * @returns {Boolean} Whether or not the number is valid.
 */
exports.validate = function(settings, phone) {
  try {
    return _init(settings, phone).validate();
  } catch (e) {
    // invalid number
  }
  return false;
};

/**
 * Returns true if the two given numbers match.
 * @param {String} a The first phone number
 * @param {String} b The second phone number
 * @returns {Boolean} Whether or not the numbers match
 */
exports.same = function(a, b) {
  try {
    var match = phonenumber.PhoneNumberUtil.getInstance().isNumberMatch(a, b);
    return match === phonenumber.PhoneNumberUtil.MatchType.NSN_MATCH ||
           match === phonenumber.PhoneNumberUtil.MatchType.EXACT_MATCH;
  } catch (e) {
    // exception thrown trying to match given numbers
  }
  return false;
};
