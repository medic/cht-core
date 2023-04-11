const { expect } = require('chai');
const { generate } = require('../../../src/libs/passwords');
const passwordTester = require('simple-password-tester');

const VALID_CHARS_PATTERN = /^[-.,:!$=\w]+$/;

describe('password-generator', () => {
  describe('generatePassword', () => {
    it('generates valid passwords when called multiple times', () => {
      Array
        .from({ length: 10 })
        .map(() => generate())
        .forEach(password => {
          expect(password).to.be.a('string');
          expect(password).to.have.length(20);
          expect(passwordTester(password)).to.be.at.least(50);
          expect(password).to.match(VALID_CHARS_PATTERN);
        });
    });

    it('generates a valid password when called with a custom length', () => {
      const password = generate(64);
      expect(password).to.be.a('string');
      expect(password).to.have.length(64);
      expect(passwordTester(password)).to.be.at.least(50);
      expect(password).to.match(VALID_CHARS_PATTERN);
    });
  });
});
