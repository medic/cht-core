/**
 * @module phone-number
 * @description Our wrapper around google's libphonenumber.
 */
const phonenumber = require('google-libphonenumber');
const CHARACTER_REGEX = /[a-z]/i;

const _init = function (settings, phone) {
  const instance = phonenumber.PhoneNumberUtil.getInstance();
  const shortInfo = phonenumber.ShortNumberInfo.getInstance();
  const countryCode = settings && settings.default_country_code;
  const regionCode = instance.getRegionCodeForCountryCode(countryCode);
  const parsed = instance.parseAndKeepRawInput(phone, regionCode);
  const validationType = ((settings && settings.phone_validation) || '').toLowerCase();

  const validPhone = () => {
    if (validationType === 'partial') {
      //Quickly guesses whether a number is a possible phone number by using only the length information,
      return instance.isPossibleNumber(parsed);
    }
    if (validationType === 'none') {
      return true;
    }
    // Does full validation of a phone number for a region using length and prefix information.
    return instance.isValidNumber(parsed);
  };

  const getScheme = (given) => {
    if (shortInfo.isValidShortNumber(parsed)) {
      return phonenumber.PhoneNumberFormat.NATIONAL;
    }
    if (typeof (given) !== 'undefined') {
      return given;
    }
    if (parsed.getCountryCode() + '' === countryCode) {
      return phonenumber.PhoneNumberFormat.NATIONAL;
    }
    return phonenumber.PhoneNumberFormat.INTERNATIONAL;
  };

  return {
    format: function (scheme) {
      if (!this.validate()) {
        return false;
      }
      return instance.format(parsed, getScheme(scheme)).toString();
    },
    validate: function () {
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
exports.normalize = function (settings, phone) {
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
exports.format = function (settings, phone) {
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
exports.validate = function (settings, phone) {
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
exports.same = function (a, b) {
  try {
    const match = phonenumber.PhoneNumberUtil.getInstance().isNumberMatch(a, b);
    return match === phonenumber.PhoneNumberUtil.MatchType.NSN_MATCH ||
      match === phonenumber.PhoneNumberUtil.MatchType.EXACT_MATCH;
  } catch (e) {
    // exception thrown trying to match given numbers
  }
  return false;
};
