var phonenumber = require('libphonenumber/utils');

var settings = {
  default_country_code: 64
};

exports['format does nothing when already formatted'] = function(test) {
  var number = '+15155556442';
  var actual = phonenumber.format(settings, number);
  test.equal(actual, number);
  test.done();
};

exports['format does not require configured country code'] = function(test) {
  var number = '+151555564422';
  var actual = phonenumber.format({}, number);
  test.equal(actual, number);
  test.done();
};

exports['format adds country code when missing'] = function(test) {
  var actual = phonenumber.format(settings, '5155556442');
  test.equal(actual, '+645155556442');
  test.done();
};

exports['format returns false when no configured country code'] = function(test) {
  var actual = phonenumber.format({}, '5155556442');
  test.strictEqual(actual, false);
  test.done();
};

exports['format returns false for invalid number'] = function(test) {
  var actual = phonenumber.format(settings, '');
  test.strictEqual(actual, false);
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

exports['validate returns false for invalid characters'] = function(test) {
  var actual = phonenumber.validate(settings, '027555Z636');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns false when letters in valid number'] = function(test) {
  // Insert letters within valid number : they shouldn't be filtered out.
  var actual = phonenumber.validate(settings, '0275552kkk636');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns false for number without country code'] = function(test) {
  var actual = phonenumber.validate({}, '5155556442');
  test.strictEqual(actual, false);
  test.done();
};

exports['validate returns true for number with default country code'] = function(test) {
  var actual = phonenumber.validate(settings, '0275552636');
  test.strictEqual(actual, true);
  test.done();
};

exports['validate returns true for number with explicit country code'] = function(test) {
  var actual = phonenumber.validate({}, '+64275552636');
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

