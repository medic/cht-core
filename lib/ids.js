var crypto = require('crypto'),
    _ = require('underscore'),
    config = require('../config'),
    LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split(''),
    format;

var addNumber = function(result, number) {
    result.push(number % 10);
    return Math.floor(number / 10);
};

var addLetter = function(result, number) {
  result.push(LETTERS[number % LETTERS.length]);
  return Math.floor(number / LETTERS.length);
};

var addCheckDigit = function(digits) {
    var offset = format.length + 1;

    var total = _.reduce(digits, function(sum, digit, index) {
        var char = format.charAt(index);
        if (/\d/.test(char)) {
            return sum + (Number(digit) * (offset - index));
        } else if (/\w/.test(char)) {
            return sum + ((_.indexOf(LETTERS, char) + 1) * (offset - index));
        } else {
            return sum;
        }
    }, 0);
    var result = total % 11;
    return digits.push(result === 10 ? 0 : result);
};

var generate = function(s) {
  var sum = crypto.createHash('md5');
  sum.update(s + '-' + new Date().getTime() * Math.random());
  var number = parseInt(sum.digest('hex').substring(0, 12), 16);
  format = config.get('id_format') || '1111';
  var result = _.reduce(format.split(''), function(memo, char) {
      if (/\d/.test(char)) {
          number = addNumber(memo, number);
      } else if (/\w/.test(char)) {
          number = addLetter(memo, number);
      } else {
          memo.push(char);
      }
      return memo;
  }, []);
  addCheckDigit(result);
  return result.join('');
};

module.exports = {
    generate: generate
};
