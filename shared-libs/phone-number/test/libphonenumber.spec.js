const assert = require('chai').assert;
const phonenumber = require('../src/phone-number');

const NZ_DOMESTIC_VALID = '0275552636';
const NZ_DOMESTIC_INVALID = '5155556442123'; // right number of digits but invalid number!
const NZ_INTERNATIONAL_VALID = '+64275552636';
const US_INTERNATIONAL_VALID = '+15155556442';
const COUNTRY_CODES = {
  new_zealand: 64,
  uganda: 256
};

const settings = {
  default_country_code: COUNTRY_CODES.new_zealand
};

describe('libphonenumber', () => {

  it('normalize does nothing when already normalized', () => {
    var number = NZ_INTERNATIONAL_VALID;
    var actual = phonenumber.normalize(settings, number);
    assert.equal(actual, number);
  });

  it('normalize does nothing when already normalized, conflicting contry code in settings', () => {
    // Settings has NZ country code, number is US/Canada number.
    var number = US_INTERNATIONAL_VALID;
    var actual = phonenumber.normalize(settings, number);
    assert.equal(actual, number);
  });

  it('normalize does not require country code in settings when number has international normalize', () => {
    var number = NZ_INTERNATIONAL_VALID;
    var actual = phonenumber.normalize({}, number);
    assert.equal(actual, number);
  });

  it('normalize adds country code when missing', () => {
    var actual = phonenumber.normalize(settings, NZ_DOMESTIC_VALID);
    assert.equal(actual, NZ_INTERNATIONAL_VALID);
  });

  it('normalize returns false when domestic number and no country code in settings', () => {
    var actual = phonenumber.normalize({}, NZ_DOMESTIC_VALID);
    assert.isFalse(actual);
  });

  it('normalize returns false for empty number', () => {
    var actual = phonenumber.normalize(settings, '');
    assert.isFalse(actual);
  });

  it('normalize returns false for invalid number', () => {
    var actual = phonenumber.normalize(settings, NZ_DOMESTIC_INVALID);
    assert.isFalse(actual);
  });

  it('normalize returns false for invalid number - replaced 1 letter <-> 1 digit', () => {
    // Invalid number for NZ
    var actual = phonenumber.normalize(settings, '02755K2636');
    assert.isFalse(actual);
  });

  it('normalize returns false for invalid number - alpha number', () => {
    // Note : 3 letters or more can be considered an alpha number (e.g. 1-(800)-MICROSOFT). We don't allow it.
    var actual = phonenumber.normalize(settings, '0275HHH636');
    assert.isFalse(actual);
  });

  it('normalize returns false for invalid number - 3 extra letters', () => {
    // Insert letters within valid number : they shouldn't be ignored.
    var actual = phonenumber.normalize(settings, '0275552kkk636');
    assert.isFalse(actual);
  });

  // Correct for libphonenumber weirdness :
  // For some reason, '<validnumber>a' or '<validnumber>aa' is valid for libphonenumber.
  // Issue : https://github.com/googlei18n/libphonenumber/issues/328
  it('normalize returns false for invalid number - two extra letters - trailing', () => {
    // Insert letters within valid number : they shouldn't be ignored.
    var actual = phonenumber.normalize(settings, NZ_DOMESTIC_VALID + 'ff');
    assert.isFalse(actual);
  });

  it('normalize returns false for invalid number - two extra letters - inside', () => {
    // Insert letters within valid number : they shouldn't be ignored.
    var actual = phonenumber.normalize(settings, '02755526ff36');
    assert.isFalse(actual);
  });

  it('normalize returns false for invalid number - invalid punctuation', () => {
    var actual = phonenumber.normalize(settings, '0275552<636>');
    assert.isFalse(actual);
  });

  it('normalize removes spaces, brackets and dots', () => {
    var expected = NZ_INTERNATIONAL_VALID;
    var actual = phonenumber.normalize(settings, '+ 6 4 - 02 7.-.5.(55((2636.');
    assert.equal(actual, expected);
  });

  it('normalize removes spaces, brackets and dots, and adds country code', () => {
    var expected = NZ_INTERNATIONAL_VALID;
    var actual = phonenumber.normalize(settings, ' 0  2 7-..5.(55((26 36.');
    assert.equal(actual, expected);
  });

  it('normalize removes extra zeros in international normalize', () => {
    // Note : that's for NZ normalize. Would be nice to test specific normalizeting issues for target countries.
    var expected = NZ_INTERNATIONAL_VALID;
    var actual = phonenumber.normalize(settings, '+640275552636'); // Remove leading 0 from domestic normalize
    assert.equal(actual, expected);
  });

  it('validation types', () => {
    var xsettings = {default_country_code: COUNTRY_CODES.new_zealand};
    // Default validation (full)
    assert.isFalse(phonenumber.validate(xsettings, '123'));
    xsettings.phone_validation = 'partial';
    assert.isFalse(phonenumber.validate(xsettings, '123456'));
    assert.isTrue(phonenumber.validate(xsettings, '1234567'));
    xsettings.phone_validation = 'none';
    assert.isTrue(phonenumber.validate(xsettings, '123'));
    xsettings.phone_validation = 'whatever';
    assert.isFalse(phonenumber.validate(xsettings, '123'));
  });

  it('validate returns false for empty number', () => {
    var actual = phonenumber.validate(settings, '');
    assert.isFalse(actual);
  });

  it('validate returns false for short number', () => {
    var actual = phonenumber.validate(settings, '223');
    assert.isFalse(actual);
  });

  it('validate returns false for invalid number', () => {
    var actual = phonenumber.validate(settings, NZ_DOMESTIC_INVALID);
    assert.isFalse(actual);
  });

  it('validate returns false for invalid number - replaced 1 letter <-> 1 digit', () => {
    var actual = phonenumber.validate(settings, '027555H636');
    assert.isFalse(actual);
  });

  it('validate returns false for invalid number - alpha number', () => {
    // Note : 3 letters or more can be considered an alpha number (e.g. 1-(800)-MICROSOFT). We don't allow it.
    var actual = phonenumber.validate(settings, '0275HHH636');
    assert.isFalse(actual);
  });

  it('validate returns false for invalid number - 3 extra letters', () => {
    // Insert letters within valid number : they shouldn't be ignored.
    var actual = phonenumber.validate(settings, '0275552kkk636');
    assert.isFalse(actual);
  });

  // Correct for libphonenumber weirdness :
  // For some reason, '<validnumber>a' or '<validnumber>aa' is valid for libphonenumber.
  // Issue : https://github.com/googlei18n/libphonenumber/issues/328
  it('validate returns false for invalid number - two extra letters - trailing', () => {
    // Insert letters within valid number : they shouldn't be ignored.
    var actual = phonenumber.validate(settings, NZ_DOMESTIC_VALID + 'ff');
    assert.isFalse(actual);
  });

  it('validate returns false for invalid number - two extra letters - inside', () => {
    // Insert letters within valid number : they shouldn't be ignored.
    var actual = phonenumber.validate(settings, '02755526ff36');
    assert.isFalse(actual);
  });

  it('validate returns false for number without country code', () => {
    var actual = phonenumber.validate({}, NZ_DOMESTIC_VALID);
    assert.isFalse(actual);
  });

  it('validate returns true for number with default country code', () => {
    var actual = phonenumber.validate(settings, NZ_DOMESTIC_VALID);
    assert.isTrue(actual);
  });

  it('validate returns true for number with explicit country code', () => {
    var actual = phonenumber.validate({}, NZ_INTERNATIONAL_VALID);
    assert.isTrue(actual);
  });

  it('validate returns true when spaces in number', () => {
    var actual = phonenumber.validate(settings, '02 75 55 26 36');
    assert.isTrue(actual);
  });

  it('validate returns true when spaces, brackets, dots, dashes in number', () => {
    // Including space after '+' and unmatched brackets.
    var actual = phonenumber.validate({default_country_code: '1'}, '+   1 --(80.0 ()()55..6 -8725');
    assert.isTrue(actual);
  });

  it('validate returns false when funky punctuation in number', () => {
    var actual = phonenumber.validate({default_country_code: '1'}, '+1 <800> 556 8725');
    assert.isFalse(actual);
  });

  it('validate returns true when extra zeros in international format', () => {
    // Note : that's for NZ normalize. Would be nice to test specific normalizeting issues for target countries.
    var actual = phonenumber.validate(settings, '+640275552636'); // Unnecessary leading 0 from domestic normalize
    assert.isTrue(actual);
  });

  // Test for overly permissive validation
  // https://github.com/medic/medic-webapp/issues/2196
  it('validate returns false when given LGs bad phone number example', () => {
    var actual = phonenumber.validate({default_country_code: COUNTRY_CODES.uganda}, '+25601234');
    assert.isFalse(actual);
  });

});
