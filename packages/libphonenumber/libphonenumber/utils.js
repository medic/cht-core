var i18n = require('libphonenumber/phoneformat'),
    standardFormat = i18n.phonenumbers.PhoneNumberFormat.E164;

var _cleanPhone = function(phone) {
  phone = phone.replace(/[^\d\+]/g, '');
  var prefix = phone.substr(0, 1) === '+' ? '+' : '';
  phone = phone.replace(/[^\d]/g, '');
  return prefix + phone;
};

var _format = function(countryCode, phone) {
  var phoneUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();
  var countryCode = phoneUtil.getRegionCodeForCountryCode(countryCode);
  var number = phoneUtil.parseAndKeepRawInput(phone, countryCode);
  return phoneUtil.format(number, standardFormat).toString();
};

exports.format = function(settings, phone) {
  var countryCode = settings.default_country_code;
  if (countryCode) {
    try {
      return _format(countryCode, _cleanPhone(phone));
    } catch(e) {}
  }
  return false;
};