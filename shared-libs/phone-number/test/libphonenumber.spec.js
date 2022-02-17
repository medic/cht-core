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
const NZ_SHORT_NUMBER = '4234'; // Three or four digits. They cannot begin with '0' or '1'

const settings = {
  default_country_code: COUNTRY_CODES.new_zealand
};

const settingsWithNoPhoneValidation = {
  default_country_code: COUNTRY_CODES.new_zealand,
  phone_validation: 'none'
};

describe('libphonenumber', () => {

  describe('normalize', () => {

    it('does nothing when already normalized', () => {
      const number = NZ_INTERNATIONAL_VALID;
      const actual = phonenumber.normalize(settings, number);
      assert.equal(actual, number);
    });

    it('does nothing when already normalized, conflicting contry code in settings', () => {
      // Settings has NZ country code, number is US/Canada number.
      const number = US_INTERNATIONAL_VALID;
      const actual = phonenumber.normalize(settings, number);
      assert.equal(actual, number);
    });

    it('does not require country code in settings when number has international normalize', () => {
      const number = NZ_INTERNATIONAL_VALID;
      const actual = phonenumber.normalize({}, number);
      assert.equal(actual, number);
    });

    it('adds country code when missing', () => {
      const actual = phonenumber.normalize(settings, NZ_DOMESTIC_VALID);
      assert.equal(actual, NZ_INTERNATIONAL_VALID);
    });

    it('returns short number when phone validation is set to none', () => {
      const actual = phonenumber.normalize(settingsWithNoPhoneValidation, NZ_SHORT_NUMBER);
      assert.equal(actual, NZ_SHORT_NUMBER);
    });

    it('returns false when domestic number and no country code in settings', () => {
      const actual = phonenumber.normalize({}, NZ_DOMESTIC_VALID);
      assert.isFalse(actual);
    });

    it('returns false for empty number', () => {
      const actual = phonenumber.normalize(settings, '');
      assert.isFalse(actual);
    });

    it('returns false for invalid number', () => {
      const actual = phonenumber.normalize(settings, NZ_DOMESTIC_INVALID);
      assert.isFalse(actual);
    });

    it('returns false for invalid number - replaced 1 letter <-> 1 digit', () => {
      // Invalid number for NZ
      const actual = phonenumber.normalize(settings, '02755K2636');
      assert.isFalse(actual);
    });

    it('returns false for invalid number - alpha number', () => {
      // Note : 3 letters or more can be considered an alpha number (e.g. 1-(800)-MICROSOFT). We don't allow it.
      const actual = phonenumber.normalize(settings, '0275HHH636');
      assert.isFalse(actual);
    });

    it('returns false for invalid number - 3 extra letters', () => {
      // Insert letters within valid number : they shouldn't be ignored.
      const actual = phonenumber.normalize(settings, '0275552kkk636');
      assert.isFalse(actual);
    });

    // Correct for libphonenumber weirdness :
    // For some reason, '<validnumber>a' or '<validnumber>aa' is valid for libphonenumber.
    // Issue : https://github.com/googlei18n/libphonenumber/issues/328
    it('returns false for invalid number - two extra letters - trailing', () => {
      // Insert letters within valid number : they shouldn't be ignored.
      const actual = phonenumber.normalize(settings, NZ_DOMESTIC_VALID + 'ff');
      assert.isFalse(actual);
    });

    it('returns false for invalid number - two extra letters - inside', () => {
      // Insert letters within valid number : they shouldn't be ignored.
      const actual = phonenumber.normalize(settings, '02755526ff36');
      assert.isFalse(actual);
    });

    it('returns false for invalid number - invalid punctuation', () => {
      const actual = phonenumber.normalize(settings, '0275552<636>');
      assert.isFalse(actual);
    });

    it('removes spaces, brackets and dots', () => {
      const expected = NZ_INTERNATIONAL_VALID;
      const actual = phonenumber.normalize(settings, '+ 6 4 - 02 7.-.5.(55((2636.');
      assert.equal(actual, expected);
    });

    it('removes spaces, brackets and dots, and adds country code', () => {
      const expected = NZ_INTERNATIONAL_VALID;
      const actual = phonenumber.normalize(settings, ' 0  2 7-..5.(55((26 36.');
      assert.equal(actual, expected);
    });

    it('removes extra zeros in international normalize', () => {
      // Note : that's for NZ normalize. Would be nice to test specific normalizeting issues for target countries.
      const expected = NZ_INTERNATIONAL_VALID;
      const actual = phonenumber.normalize(settings, '+640275552636'); // Remove leading 0 from domestic normalize
      assert.equal(actual, expected);
    });

  });

  describe('validate', () => {

    it('validation types', () => {
      const xsettings = {default_country_code: COUNTRY_CODES.new_zealand};
      // Default validation (full)
      assert.isFalse(phonenumber.validate(xsettings, '123'));
      xsettings.phone_validation = 'partial';
      assert.isFalse(phonenumber.validate(xsettings, '1234'));
      assert.isTrue(phonenumber.validate(xsettings, '123456'));
      assert.isTrue(phonenumber.validate(xsettings, '1234567'));
      xsettings.phone_validation = 'none';
      assert.isTrue(phonenumber.validate(xsettings, '123'));
      xsettings.phone_validation = 'whatever';
      assert.isFalse(phonenumber.validate(xsettings, '123'));
    });

    it('returns false for empty number', () => {
      const actual = phonenumber.validate(settings, '');
      assert.isFalse(actual);
    });

    it('returns false for short number', () => {
      const actual = phonenumber.validate(settings, '223');
      assert.isFalse(actual);
    });

    it('returns false for invalid number', () => {
      const actual = phonenumber.validate(settings, NZ_DOMESTIC_INVALID);
      assert.isFalse(actual);
    });

    it('returns false for invalid number - replaced 1 letter <-> 1 digit', () => {
      const actual = phonenumber.validate(settings, '027555H636');
      assert.isFalse(actual);
    });

    it('returns false for invalid number - alpha number', () => {
      // Note : 3 letters or more can be considered an alpha number (e.g. 1-(800)-MICROSOFT). We don't allow it.
      const actual = phonenumber.validate(settings, '0275HHH636');
      assert.isFalse(actual);
    });

    it('returns false for invalid number - 3 extra letters', () => {
      // Insert letters within valid number : they shouldn't be ignored.
      const actual = phonenumber.validate(settings, '0275552kkk636');
      assert.isFalse(actual);
    });

    // Correct for libphonenumber weirdness :
    // For some reason, '<validnumber>a' or '<validnumber>aa' is valid for libphonenumber.
    // Issue : https://github.com/googlei18n/libphonenumber/issues/328
    it('returns false for invalid number - two extra letters - trailing', () => {
      // Insert letters within valid number : they shouldn't be ignored.
      const actual = phonenumber.validate(settings, NZ_DOMESTIC_VALID + 'ff');
      assert.isFalse(actual);
    });

    it('returns false for invalid number - two extra letters - inside', () => {
      // Insert letters within valid number : they shouldn't be ignored.
      const actual = phonenumber.validate(settings, '02755526ff36');
      assert.isFalse(actual);
    });

    it('returns false for number without country code', () => {
      const actual = phonenumber.validate({}, NZ_DOMESTIC_VALID);
      assert.isFalse(actual);
    });

    it('returns true for number with default country code', () => {
      const actual = phonenumber.validate(settings, NZ_DOMESTIC_VALID);
      assert.isTrue(actual);
    });

    it('returns true for number with explicit country code', () => {
      const actual = phonenumber.validate({}, NZ_INTERNATIONAL_VALID);
      assert.isTrue(actual);
    });

    it('returns true when spaces in number', () => {
      const actual = phonenumber.validate(settings, '02 75 55 26 36');
      assert.isTrue(actual);
    });

    it('returns true when spaces, brackets, dots, dashes in number', () => {
      // Including space after '+' and unmatched brackets.
      const actual = phonenumber.validate({default_country_code: '1'}, '+   1 --(80.0 ()()55..6 -8725');
      assert.isTrue(actual);
    });

    it('returns false when funky punctuation in number', () => {
      const actual = phonenumber.validate({default_country_code: '1'}, '+1 <800> 556 8725');
      assert.isFalse(actual);
    });

    it('returns true when extra zeros in international format', () => {
      // Note : that's for NZ normalize. Would be nice to test specific normalizeting issues for target countries.
      const actual = phonenumber.validate(settings, '+640275552636'); // Unnecessary leading 0 from domestic normalize
      assert.isTrue(actual);
    });

    // Test for overly permissive validation
    // https://github.com/medic/medic/issues/2196
    it('returns false when given LGs bad phone number example', () => {
      const actual = phonenumber.validate({default_country_code: COUNTRY_CODES.uganda}, '+25601234');
      assert.isFalse(actual);
    });

  });

  describe('same', () => {

    it('returns true for different formats', () => {
      const actual = phonenumber.same('+640275552636', '64-27-555-2636');
      assert.isTrue(actual);
    });

    it('returns false for different numbers', () => {
      const actual = phonenumber.same('+640275552637', '64-27-555-2636');
      assert.isFalse(actual);
    });

    it('missing country code matches default', () => {
      const actual = phonenumber.same('+41446681800', '446681800');
      assert.isTrue(actual);
    });

  });

});
