var _ = require('underscore');

/*
Is not used to actually directly check ID validity: instead, it introduces an inherent
check that the ID is the correct one, because making a mistake like transposing
two numbers results in a different checksum digit, and thus an invalid id.
 - 1234 -> 12348
 - 1324 -> 13249, a transpose also changes the checksum id
*/
var addCheckDigit = function(digits) {
  var digitArray = digits.split('');

  var offset = digitArray.length + 1;
  var total = _.reduce(digitArray, function(sum, digit, index) {
    return sum + (Number(digit) * (offset - index));
  }, 0);
  var result = total % 11;
  digitArray.push(result === 10 ? 0 : result);

  return digitArray.join('');
};

module.exports = {
    /*
      Generates a random N digit ID. The last ID is a checksum digit
    */
    generate: function(length) {
      if (length && typeof length !== 'number') {
        throw new Error('generate requires that you pass it a length 0 < x < 14');
      }

      if (length >= 14) {
        // TODO: when we support a million billion patients per installation change
        //       the algorithm to support it ;-)
        throw new Error('WARNING: id length of ' + length + ' is too long');
      }

      var randomDigits = String(Math.random() * 10).replace('.','');

      return addCheckDigit(randomDigits.substring(0, length - 1));
    },
};
