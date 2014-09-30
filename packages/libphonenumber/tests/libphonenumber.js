var phonenumber = require('libphonenumber/utils');

var settings = {
  default_country_code: 64
};

exports['format does nothing when already formatted'] = function(test) {
  var number = '+15158226442';
  var actual = phonenumber.format(settings, number);
  test.equal(actual, number);
  test.done();
};

exports['format adds country code when missing'] = function(test) {
  var actual = phonenumber.format(settings, '5158226442');
  test.equal(actual, '+645158226442');
  test.done();
};

exports['format returns false when no configured country code'] = function(test) {
  var actual = phonenumber.format({}, '5158226442');
  test.strictEqual(actual, false);
  test.done();
};

exports['format returns false for invalid number'] = function(test) {
  var actual = phonenumber.format(settings, '');
  test.strictEqual(actual, false);
  test.done();
};