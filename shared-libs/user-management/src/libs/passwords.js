const _ = require('lodash');
const passwordTester = require('simple-password-tester');

const PASSWORD_MINIMUM_LENGTH = 20;
const PASSWORD_MINIMUM_SCORE = 50;

/**
 * Generates a complex enough password with a given length
 * @param {Number} length
 * @returns {string} - the generated password
 */
const generate = (length = PASSWORD_MINIMUM_LENGTH) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!$-=';
  let password;
  do {
    password = Array.from({ length }).map(() => _.sample(chars)).join('');
  } while (passwordTester(password) < PASSWORD_MINIMUM_SCORE);

  return password;
};

module.exports = {
  generate,
};
