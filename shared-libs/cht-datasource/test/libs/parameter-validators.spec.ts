import { ContactTypeQualifier, FreetextQualifier } from '../../src/qualifier';
import { expect } from 'chai';
import {
  assertCursor,
  assertFreetextQualifier,
  assertLimit,
  assertTypeQualifier,
  assertContactTypeFreetextQualifier, assertUuidQualifier
} from '../../src/libs/parameter-validators';
import { InvalidArgumentError } from '../../src';

describe('libs parameter-validators', () => {
  describe('assertTypeQualifier', () => {
    it('should not throw for valid contact type qualifier', () => {
      const validQualifier: ContactTypeQualifier = { contactType: 'person' };
      expect(() => assertTypeQualifier(validQualifier)).to.not.throw();
    });

    [
      null,
      undefined,
      '',
      123,
      {},
      { wrongProp: 'value' }
    ].forEach((typeValue) => {
      it(`should throw for invalid contact type qualifier: ${typeValue as string}`, () => {
        expect(() => assertTypeQualifier(typeValue))
          .to.throw(InvalidArgumentError)
          .with.property('message')
          .that.includes('Invalid contact type');
      });
    });
  });

  describe('assertLimit', () => {
    it('should not throw for valid number limits', () => {
      const validLimits = [1, 10, '1', '10'];
      validLimits.forEach(limit => {
        expect(() => assertLimit(limit)).to.not.throw();
      });
    });

    [
      0,
      -1,
      '0',
      '-1',
      'abc',
      null,
      undefined,
      {},
      [],
      1.5,
      '1.5'
    ].forEach(limit => {
      it(`should throw for invalid limits: ${JSON.stringify(limit)}`, () => {
        expect(() => assertLimit(limit))
          .to.throw(InvalidArgumentError)
          .with.property('message')
          .that.includes('The limit must be a positive number');
      });
    });
  });

  describe('assertCursor', () => {
    it('should not throw for valid cursors', () => {
      const validCursors = ['valid-cursor', 'abc123', null];
      validCursors.forEach(cursor => {
        expect(() => assertCursor(cursor)).to.not.throw();
      });
    });

    ['', undefined, {}, [], 123].forEach(cursor => {
      it(`should throw for invalid cursors: ${JSON.stringify(cursor)}`, () => {
        expect(() => assertCursor(cursor))
          .to.throw(InvalidArgumentError)
          .with.property('message')
          .that.includes('Invalid cursor token');
      });
    });
  });

  describe('assertFreetextQualifier', () => {
    it('should not throw for valid freetext qualifier', () => {
      const validQualifier: FreetextQualifier = { freetext: 'search text' };
      expect(() => assertFreetextQualifier(validQualifier)).to.not.throw();
    });

    [
      null,
      undefined,
      '',
      123,
      {},
      { wrongProp: 'value' }
    ].forEach(freetext => {
      it(`should throw for invalid freetext qualifier: ${JSON.stringify(freetext)}`, () => {
        expect(() => assertFreetextQualifier(freetext))
          .to.throw(InvalidArgumentError)
          .with.property('message')
          .that.includes('Invalid freetext');
      });
    });
  });

  describe('assertContactTypeFreetextQualifier', () => {
    it('should pass when given a valid contact type qualifier', () => {
      const validContactType = { contactType: 'email' };

      expect(() => assertContactTypeFreetextQualifier(validContactType)).to.not.throw();
    });

    it('should pass when given a valid freetext qualifier', () => {
      const validFreetext = { freetext: 'some text' };

      expect(() => assertContactTypeFreetextQualifier(validFreetext)).to.not.throw();
    });

    it('should throw InvalidArgumentError when given an invalid qualifier', () => {
      const invalidQualifier = { invalid: 'data' };

      expect(() => assertContactTypeFreetextQualifier(invalidQualifier)).to.throw(InvalidArgumentError);
    });

    it('should throw InvalidArgumentError with correct message for invalid qualifier', () => {
      const invalidQualifier = { invalid: 'data' };

      expect(() => assertContactTypeFreetextQualifier(invalidQualifier)).to.throw(
        InvalidArgumentError,
        'Invalid qualifier [{"invalid":"data"}]. Must be a contact type and/or freetext qualifier.'
      );
    });

    it('should throw InvalidArgumentError when freetext is too short', () => {
      const shortFreetext = { freetext: 'ab' };  // Less than 3 characters

      expect(() => assertContactTypeFreetextQualifier(shortFreetext)).to.throw(InvalidArgumentError);
    });

    it('should pass when object satisfies both qualifier types', () => {
      const validBothTypes = {
        contactType: 'email',
        freetext: 'some text'
      };

      expect(() => assertContactTypeFreetextQualifier(validBothTypes)).to.not.throw();
    });

    it('should handle null input appropriately', () => {
      expect(() => assertContactTypeFreetextQualifier(null)).to.throw(InvalidArgumentError);
    });

    it('should handle undefined input appropriately', () => {
      expect(() => assertContactTypeFreetextQualifier(undefined)).to.throw(InvalidArgumentError);
    });
  });

  describe('assertUuidQualifier', () => {
    it('should pass when given a valid UUID qualifier', () => {
      const validUuid = { uuid: '123e4567-e89b-12d3-a456-426614174000' };

      expect(() => assertUuidQualifier(validUuid)).to.not.throw();
    });

    it('should throw InvalidArgumentError when given an invalid object', () => {
      const invalidObject = { somethingElse: '123e4567-e89b-12d3-a456-426614174000' };

      expect(() => assertUuidQualifier(invalidObject)).to.throw(InvalidArgumentError);
    });

    it('should throw InvalidArgumentError with correct message for invalid qualifier', () => {
      const invalidObject = { somethingElse: '123e4567-e89b-12d3-a456-426614174000' };

      expect(() => assertUuidQualifier(invalidObject)).to.throw(
        InvalidArgumentError,
        `Invalid identifier [{"somethingElse":"123e4567-e89b-12d3-a456-426614174000"}].`
      );
    });

    it('should handle null input appropriately', () => {
      expect(() => assertUuidQualifier(null)).to.throw(InvalidArgumentError);
    });

    it('should handle undefined input appropriately', () => {
      expect(() => assertUuidQualifier(undefined)).to.throw(InvalidArgumentError);
    });

    it('should throw InvalidArgumentError when given an empty object', () => {
      expect(() => assertUuidQualifier({})).to.throw(InvalidArgumentError);
    });

    it('should throw InvalidArgumentError when uuid property is not a string', () => {
      const invalidType = { uuid: 123 };

      expect(() => assertUuidQualifier(invalidType)).to.throw(InvalidArgumentError);
    });
  });
});
