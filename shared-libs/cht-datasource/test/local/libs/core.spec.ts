import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import {
  assertFieldsUnchanged,
  getReportedDateTimestamp,
  normalizeFreetext,
  validateCursor
} from '../../../src/local/libs/core';
import { InvalidArgumentError } from '../../../src';

describe('local core', () => {
  afterEach(() => sinon.restore());

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
        'The cursor must be a string or null for first page: ["-1"].'
      );
      expect(() => validateCursor('-100')).to.throw(
        InvalidArgumentError,
        'The cursor must be a string or null for first page: ["-100"].'
      );
    });

    it('should throw InvalidArgumentError for non-integer numbers', () => {
      expect(() => validateCursor('1.5')).to.throw(
        InvalidArgumentError,
        'The cursor must be a string or null for first page: ["1.5"].'
      );
      expect(() => validateCursor('0.1')).to.throw(
        InvalidArgumentError,
        'The cursor must be a string or null for first page: ["0.1"].'
      );
    });

    it('should throw InvalidArgumentError for non-numeric strings', () => {
      expect(() => validateCursor('abc')).to.throw(
        InvalidArgumentError,
        'The cursor must be a string or null for first page: ["abc"].'
      );
      expect(() => validateCursor('123abc')).to.throw(
        InvalidArgumentError,
        'The cursor must be a string or null for first page: ["123abc"].'
      );
    });

    it('should handle string numbers with leading zeros', () => {
      expect(validateCursor('00')).to.equal(0);
      expect(validateCursor('01')).to.equal(1);
      expect(validateCursor('000100')).to.equal(100);
    });
  });

  describe('normalizeFreetext', () => {
    it('should trim whitespace from freetext', () => {
      expect(normalizeFreetext('  hello  ')).to.equal('hello');
      expect(normalizeFreetext('\thello\n')).to.equal('hello');
    });

    it('should convert freetext to lowercase', () => {
      expect(normalizeFreetext('HELLO')).to.equal('hello');
      expect(normalizeFreetext('HeLLo WoRLD')).to.equal('hello world');
    });
  });

  describe('assertFieldsUnchanged', () => {
    it('should not throw when specified fields are unchanged', () => {
      const original = { _id: '123', _rev: '1', name: 'test' };
      const updated = { _id: '123', _rev: '1', name: 'updated' };

      expect(() => assertFieldsUnchanged(original, updated, ['_id', '_rev'])).to.not.throw();
    });

    it('should throw InvalidArgumentError when a field has changed', () => {
      const original = { _id: '123', _rev: '1' };
      const updated = { _id: '456', _rev: '2' };

      expect(() => assertFieldsUnchanged(original, updated, ['_id', '_rev']))
        .to.throw(InvalidArgumentError, 'The [_id] field must not be changed.');
    });
  });

  describe('getReportedDateTimestamp', () => {
    it('should return timestamp from a valid date string', () => {
      const result = getReportedDateTimestamp('2023-06-15T12:00:00.000Z');
      expect(result).to.equal(new Date('2023-06-15T12:00:00.000Z').getTime());
    });

    it('should return timestamp from a numeric value', () => {
      const timestamp = 1687003200000;
      const result = getReportedDateTimestamp(timestamp);
      expect(result).to.equal(timestamp);
    });

    it('should return Date.now() when reportedDate is not provided', () => {
      const dateNow = sinon.stub(Date, 'now').returns(1234567890000);
      const result = getReportedDateTimestamp();
      expect(result).to.equal(1234567890000);
      expect(dateNow.calledOnce).to.be.true;
    });

    it('should throw InvalidArgumentError for invalid date string', () => {
      expect(() => getReportedDateTimestamp('invalid-date'))
        .to.throw(InvalidArgumentError, 'Invalid date value [invalid-date].');
    });
  });
});
