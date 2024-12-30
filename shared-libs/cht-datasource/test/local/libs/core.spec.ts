import { expect } from 'chai';
import { validateCursor } from '../../../src/local/libs/core';
import { InvalidArgumentError } from '../../../src';

describe('validateCursor', () => {
  it('should return the numeric value when given a valid numeric string', () => {
    expect(validateCursor('0')).to.equal(0);
    expect(validateCursor('1')).to.equal(1);
    expect(validateCursor('100')).to.equal(100);
  });

  it('should accept null and treat it as 0', () => {
    expect(validateCursor(null)).to.equal(0);
  });

  it('should throw InvalidArgumentError for negative numbers', () => {
    expect(() => validateCursor('-1')).to.throw(
      InvalidArgumentError,
      'Invalid cursor token: [-1].'
    );
    expect(() => validateCursor('-100')).to.throw(
      InvalidArgumentError,
      'Invalid cursor token: [-100].'
    );
  });

  it('should throw InvalidArgumentError for non-integer numbers', () => {
    expect(() => validateCursor('1.5')).to.throw(
      InvalidArgumentError,
      'Invalid cursor token: [1.5].'
    );
    expect(() => validateCursor('0.1')).to.throw(
      InvalidArgumentError,
      'Invalid cursor token: [0.1].'
    );
  });

  it('should throw InvalidArgumentError for non-numeric strings', () => {
    expect(() => validateCursor('abc')).to.throw(
      InvalidArgumentError,
      'Invalid cursor token: [abc].'
    );
    expect(() => validateCursor('123abc')).to.throw(
      InvalidArgumentError,
      'Invalid cursor token: [123abc].'
    );
  });

  it('should handle string numbers with leading zeros', () => {
    expect(validateCursor('00')).to.equal(0);
    expect(validateCursor('01')).to.equal(1);
    expect(validateCursor('000100')).to.equal(100);
  });
});
