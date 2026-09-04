import { expect } from 'chai';

const {
  parsePyxformBoolean,
  isPyxformTruthy,
} = require('../../../../../src/js/enketo/lib/pyxform-boolean');

describe('Enketo: pyxform boolean lib', () => {
  [
    'yes',
    'Yes',
    'YES',
    ' true ',
    'true',
    'True',
    'TRUE',
    'true()',
    ' TRUE() '
  ].forEach((truthyValue) => {
    it(`parsePyxformBoolean returns true for ${truthyValue}`, () => {
      expect(parsePyxformBoolean(truthyValue)).to.equal(true);
      expect(isPyxformTruthy(truthyValue)).to.equal(true);
    });
  });

  [
    'no',
    'No',
    'NO',
    ' false ',
    'false',
    'False',
    'FALSE',
    'false()',
    ' FALSE() '
  ].forEach((falsyValue) => {
    it(`parsePyxformBoolean returns false for ${falsyValue}`, () => {
      expect(parsePyxformBoolean(falsyValue)).to.equal(false);
      expect(isPyxformTruthy(falsyValue)).to.equal(false);
    });
  });

  [
    undefined,
    null,
    '',
    '  ',
    'truthy',
    '1',
    '0',
    true,
    false,
    1,
    0,
    {},
    []
  ].forEach((invalidValue) => {
    it(`parsePyxformBoolean returns null for ${String(invalidValue)}`, () => {
      expect(parsePyxformBoolean(invalidValue)).to.equal(null);
      expect(isPyxformTruthy(invalidValue)).to.equal(false);
    });
  });
});
