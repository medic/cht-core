var proxyquire = require('proxyquire');
var phonenumber = proxyquire('../../../packages/libphonenumber/libphonenumber/utils', {
  'kujua-utils':  {}
});

var validNumNZDomestic = '0275552636'; 
var validNumNZInternational = '+64275552636';
// Watch out : right number of digits may still be invalid number!
var invalidNumNZDomestic = '5155556442123'; 
var validNumUSInternational = '+15155556442';
var settings = {
  default_country_code: 64
};

exports['format does nothing when already formatted'] = function(test) {
  var number = validNumNZInternational;
  var actual = phonenumber.format(settings, number);
  test.equal(actual, number);
  test.done();
};

exports['format does nothing when already formatted, conflicting contry code in settings'] = function(test) {
  // Settings has NZ country code, number is US/Canada number.
  var number = validNumUSInternational;
  var actual = phonenumber.format(settings, number);
  test.equal(actual, number);
  test.done();
};

exports['format does not require country code in settings when number has international format'] = function(test) {
  var number = validNumNZInternational;
  var actual = phonenumber.format({}, number);
  test.equal(actual, number);
  test.done();
};

exports['format adds country code when missing'] = function(test) {
  var actual = phonenumber.format(settings, validNumNZDomestic);
  test.equal(actual, validNumNZInternational);
  test.done();
};

exports['format returns false when domestic number and no country code in settings'] = function(test) {
  var actual = phonenumber.format({}, validNumNZDomestic);
  test.strictEqual(actual, false);
  test.done();
};

exports['format returns false for empty number'] = function(test) {
  var actual = phonenumber.format(settings, '');
  test.strictEqual(actual, false);
  test.done();
};

exports['format returns false for invalid number'] = function(test) {
  var actual = phonenumber.format(settings, invalidNumNZDomestic);
  test.strictEqual(actual, false);
  test.done();
};

exports['format returns false for invalid number - replaced 1 letter <-> 1 digit'] = function(test) {
  // Invalid number for NZ
  var actual = phonenumber.format(settings, '02755K2636');
  test.strictEqual(actual, false);
  test.done();
};

exports['format returns false for invalid number - alpha number'] = function(test) {
  // Note : 3 letters or more can be considered an alpha number (e.g. 1-(800)-MICROSOFT). We don't allow it.
  var actual = phonenumber.format(settings, '0275HHH636');
  test.strictEqual(actual, false);
  test.done();
};

exports['format returns false for invalid number - 3 extra letters'] = function(test) {
  // Insert letters within valid number : they shouldn't be ignored.
  var actual = phonenumber.format(settings, '0275552kkk636');
  test.strictEqual(actual, false);
  test.done();
};

// Correct for libphonenumber weirdness : 
// For some reason, '<validnumber>a' or '<validnumber>aa' is valid for libphonenumber.
// Issue : https://github.com/googlei18n/libphonenumber/issues/328
exports['format returns false for invalid number - two extra letters - trailing'] = function(test) {
  // Insert letters within valid number : they shouldn't be ignored.
  var actual = phonenumber.format(settings, validNumNZDomestic + 'ff');
  test.strictEqual(actual, false);
  test.done();
};

exports['format returns false for invalid number - two extra letters - inside'] = function(test) {
  // Insert letters within valid number : they shouldn't be ignored.
  var actual = phonenumber.format(settings, '02755526ff36');
  test.strictEqual(actual, false);
  test.done();
};

exports['format returns false for invalid number - invalid punctuation'] = function(test) {
  var actual = phonenumber.format(settings, '0275552<636>');
  test.strictEqual(actual, false);
  test.done();
};

exports['format removes spaces, brackets and dots'] = function(test) {
  var expected = validNumNZInternational;
  var actual = phonenumber.format(settings, '+ 6 4 - 02 7.-.5.(55((2636.');
  test.strictEqual(actual, expected);
  test.done();
};

exports['format removes spaces, brackets and dots, and adds country code'] = function(test) {
  var expected = validNumNZInternational;
  var actual = phonenumber.format(settings, ' 0  2 7-..5.(55((26 36.');
  test.strictEqual(actual, expected);
  test.done();
};

exports['format removes extra zeros in international format'] = function(test) {
  // Note : that's for NZ format. Would be nice to test specific formatting issues for target countries.
  var expected = validNumNZInternational;
  var actual = phonenumber.format(settings, '+640275552636'); // Remove leading 0 from domestic format
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
  var actual = phonenumber.validate(settings, invalidNumNZDomestic);
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
  var actual = phonenumber.validate(settings, validNumNZDomestic + 'ff');
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
  var actual = phonenumber.validate({}, validNumNZDomestic);
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns true for number with default country code'] = function(test) {
  var actual = phonenumber.validate(settings, validNumNZDomestic);
  test.strictEqual(actual, true);
  test.done();
};

exports['validate returns true for number with explicit country code'] = function(test) {
  var actual = phonenumber.validate({}, validNumNZInternational);
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
  // Note : that's for NZ format. Would be nice to test specific formatting issues for target countries.
  var actual = phonenumber.validate(settings, '+640275552636'); // Unnecessary leading 0 from domestic format
  test.strictEqual(actual, true);
  test.done();
};

