var proxyquire = require('proxyquire').noCallThru();
var phonenumber = proxyquire('../../../packages/libphonenumber/libphonenumber/utils', {
  'libphonenumber/libphonenumber': require('../../../packages/libphonenumber/libphonenumber/libphonenumber')
});

var NZ_DOMESTIC_VALID = '0275552636';
var NZ_DOMESTIC_INVALID = '5155556442123'; // right number of digits but invalid number!
var NZ_INTERNATIONAL_VALID = '+64275552636';
var US_INTERNATIONAL_VALID = '+15155556442';
var COUNTRY_CODES = {
  new_zealand: 64,
  uganda: 256
};

var settings = {
  default_country_code: COUNTRY_CODES.new_zealand
};

exports['normalize does nothing when already normalized'] = function(test) {
  var number = NZ_INTERNATIONAL_VALID;
  var actual = phonenumber.normalize(settings, number);
  test.equal(actual, number);
  test.done();
};

exports['normalize does nothing when already normalized, conflicting contry code in settings'] = function(test) {
  // Settings has NZ country code, number is US/Canada number.
  var number = US_INTERNATIONAL_VALID;
  var actual = phonenumber.normalize(settings, number);
  test.equal(actual, number);
  test.done();
};

exports['normalize does not require country code in settings when number has international normalize'] = function(test) {
  var number = NZ_INTERNATIONAL_VALID;
  var actual = phonenumber.normalize({}, number);
  test.equal(actual, number);
  test.done();
};

exports['normalize adds country code when missing'] = function(test) {
  var actual = phonenumber.normalize(settings, NZ_DOMESTIC_VALID);
  test.equal(actual, NZ_INTERNATIONAL_VALID);
  test.done();
};

exports['normalize returns false when domestic number and no country code in settings'] = function(test) {
  var actual = phonenumber.normalize({}, NZ_DOMESTIC_VALID);
  test.strictEqual(actual, false);
  test.done();
};

exports['normalize returns false for empty number'] = function(test) {
  var actual = phonenumber.normalize(settings, '');
  test.strictEqual(actual, false);
  test.done();
};

exports['normalize returns false for invalid number'] = function(test) {
  var actual = phonenumber.normalize(settings, NZ_DOMESTIC_INVALID);
  test.strictEqual(actual, false);
  test.done();
};

exports['normalize returns false for invalid number - replaced 1 letter <-> 1 digit'] = function(test) {
  // Invalid number for NZ
  var actual = phonenumber.normalize(settings, '02755K2636');
  test.strictEqual(actual, false);
  test.done();
};

exports['normalize returns false for invalid number - alpha number'] = function(test) {
  // Note : 3 letters or more can be considered an alpha number (e.g. 1-(800)-MICROSOFT). We don't allow it.
  var actual = phonenumber.normalize(settings, '0275HHH636');
  test.strictEqual(actual, false);
  test.done();
};

exports['normalize returns false for invalid number - 3 extra letters'] = function(test) {
  // Insert letters within valid number : they shouldn't be ignored.
  var actual = phonenumber.normalize(settings, '0275552kkk636');
  test.strictEqual(actual, false);
  test.done();
};

// Correct for libphonenumber weirdness : 
// For some reason, '<validnumber>a' or '<validnumber>aa' is valid for libphonenumber.
// Issue : https://github.com/googlei18n/libphonenumber/issues/328
exports['normalize returns false for invalid number - two extra letters - trailing'] = function(test) {
  // Insert letters within valid number : they shouldn't be ignored.
  var actual = phonenumber.normalize(settings, NZ_DOMESTIC_VALID + 'ff');
  test.strictEqual(actual, false);
  test.done();
};

exports['normalize returns false for invalid number - two extra letters - inside'] = function(test) {
  // Insert letters within valid number : they shouldn't be ignored.
  var actual = phonenumber.normalize(settings, '02755526ff36');
  test.strictEqual(actual, false);
  test.done();
};

exports['normalize returns false for invalid number - invalid punctuation'] = function(test) {
  var actual = phonenumber.normalize(settings, '0275552<636>');
  test.strictEqual(actual, false);
  test.done();
};

exports['normalize removes spaces, brackets and dots'] = function(test) {
  var expected = NZ_INTERNATIONAL_VALID;
  var actual = phonenumber.normalize(settings, '+ 6 4 - 02 7.-.5.(55((2636.');
  test.strictEqual(actual, expected);
  test.done();
};

exports['normalize removes spaces, brackets and dots, and adds country code'] = function(test) {
  var expected = NZ_INTERNATIONAL_VALID;
  var actual = phonenumber.normalize(settings, ' 0  2 7-..5.(55((26 36.');
  test.strictEqual(actual, expected);
  test.done();
};

exports['normalize removes extra zeros in international normalize'] = function(test) {
  // Note : that's for NZ normalize. Would be nice to test specific normalizeting issues for target countries.
  var expected = NZ_INTERNATIONAL_VALID;
  var actual = phonenumber.normalize(settings, '+640275552636'); // Remove leading 0 from domestic normalize
  test.strictEqual(actual, expected);
  test.done();
};

exports['validate returns false for empty number'] = function(test) {
  var actual = phonenumber.validate(settings, '');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns false for short number'] = function(test) {
  var actual = phonenumber.validate(settings, '223');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns false for invalid number'] = function(test) {
  var actual = phonenumber.validate(settings, NZ_DOMESTIC_INVALID);
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns false for invalid number - replaced 1 letter <-> 1 digit'] = function(test) {
  var actual = phonenumber.validate(settings, '027555H636');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns false for invalid number - alpha number'] = function(test) {
  // Note : 3 letters or more can be considered an alpha number (e.g. 1-(800)-MICROSOFT). We don't allow it.
  var actual = phonenumber.validate(settings, '0275HHH636');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns false for invalid number - 3 extra letters'] = function(test) {
  // Insert letters within valid number : they shouldn't be ignored.
  var actual = phonenumber.validate(settings, '0275552kkk636');
  test.strictEqual(actual, false);
  test.done();
};

// Correct for libphonenumber weirdness : 
// For some reason, '<validnumber>a' or '<validnumber>aa' is valid for libphonenumber.
// Issue : https://github.com/googlei18n/libphonenumber/issues/328
exports['validate returns false for invalid number - two extra letters - trailing'] = function(test) {
  // Insert letters within valid number : they shouldn't be ignored.
  var actual = phonenumber.validate(settings, NZ_DOMESTIC_VALID + 'ff');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns false for invalid number - two extra letters - inside'] = function(test) {
  // Insert letters within valid number : they shouldn't be ignored.
  var actual = phonenumber.validate(settings, '02755526ff36');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns false for number without country code'] = function(test) {
  var actual = phonenumber.validate({}, NZ_DOMESTIC_VALID);
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns true for number with default country code'] = function(test) {
  var actual = phonenumber.validate(settings, NZ_DOMESTIC_VALID);
  test.strictEqual(actual, true);
  test.done();
};

exports['validate returns true for number with explicit country code'] = function(test) {
  var actual = phonenumber.validate({}, NZ_INTERNATIONAL_VALID);
  test.strictEqual(actual, true);
  test.done();
};

exports['validate returns true when spaces in number'] = function(test) {
  var actual = phonenumber.validate(settings, '02 75 55 26 36');
  test.strictEqual(actual, true);
  test.done();
};

exports['validate returns true when spaces, brackets, dots, dashes in number'] = function(test) {
  // Including space after '+' and unmatched brackets.
  var actual = phonenumber.validate({default_country_code: '1'}, '+   1 --(80.0 ()()55..6 -8725');
  test.strictEqual(actual, true);
  test.done();
};

exports['validate returns false when funky punctuation in number'] = function(test) {
  var actual = phonenumber.validate({default_country_code: '1'}, '+1 <800> 556 8725');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns true when extra zeros in international format'] = function(test) {
  // Note : that's for NZ normalize. Would be nice to test specific normalizeting issues for target countries.
  var actual = phonenumber.validate(settings, '+640275552636'); // Unnecessary leading 0 from domestic normalize
  test.strictEqual(actual, true);
  test.done();
};

// Test for overly permissive validation
// https://github.com/medic/medic-webapp/issues/2196
exports['validate returns false when given LGs bad phone number example'] = function(test) {
  var actual = phonenumber.validate({default_country_code: COUNTRY_CODES.uganda}, '+25601234');
  test.strictEqual(actual, false);
  test.done();
};
