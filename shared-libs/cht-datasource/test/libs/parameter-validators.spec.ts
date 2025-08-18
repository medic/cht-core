import { ContactTypeQualifier, FreetextQualifier } from '../../src/qualifier';
import { expect } from 'chai';
import {
  assertContactTypeFreetextQualifier,
  assertCursor,
  assertFreetextQualifier,
  assertLimit,
  assertPersonInput,
  assertPlaceInput,
  assertReportInput,
  assertTypeQualifier,
  assertUuidQualifier
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
      const validLimits = [ 1, 10, '1', '10' ];
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
          .that.includes('The limit must be a positive integer');
      });
    });
  });

  describe('assertCursor', () => {
    it('should not throw for valid cursors', () => {
      const validCursors = [ 'valid-cursor', 'abc123', null ];
      validCursors.forEach(cursor => {
        expect(() => assertCursor(cursor)).to.not.throw();
      });
    });

    [ '', undefined, {}, [], 123 ].forEach(cursor => {
      it(`should throw for invalid cursors: ${JSON.stringify(cursor)}`, () => {
        expect(() => assertCursor(cursor))
          .to.throw(InvalidArgumentError)
          .with.property('message')
          .that.includes('The cursor must be a string or null for first page');
      });
    });
  });

  describe('assertFreetextQualifier', () => {
    it('should not throw for valid freetext qualifier', () => {
      const validQualifier: FreetextQualifier = { freetext: 'key:search text' };
      expect(() => assertFreetextQualifier(validQualifier)).to.not.throw();
    });

    [
      null,
      undefined,
      '',
      ' ',
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
      const validFreetext = { freetext: 'some-text' };

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

  describe('assertPersonInput', () => {
    it('throws error for invalid person input with missing fields', () => {
      const personInput = {
        name: 'apoorva',
        type: 'person'
      };
      expect(() => assertPersonInput(personInput)).to.throw(
        InvalidArgumentError,
        `Invalid person type [${JSON.stringify(personInput)}].`
      );
    });

    it('throws error for invalid person input here with invalid reported_date', () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: 'p1',
        reported_date: 'last august'
      };
      expect(() => assertPersonInput(personInput)).to.throw(
        InvalidArgumentError,
        `Invalid person type [${JSON.stringify(personInput)}].`
      );
    });

    it('should not throw error for a valid person input', () => {
      const personInput = {
        name: 'apoorva',
        type: 'person',
        parent: 'p1',
      };
      expect(() => assertPersonInput(personInput)).to.not.throw();
    });
  });

  describe('assertPlaceInput', () => {
    it('throws error for invalid place input with missing field `name`', () => {
      const placeInput = {
        type: 'district_hospital'
      };
      expect(() => assertPlaceInput(placeInput)).to.throw(
        InvalidArgumentError,
        `Invalid place type [${JSON.stringify(placeInput)}].`
      );
    });

    it('should not throw error for a valid place input', () => {
      const placeInput = {
        name: 'h1',
        type: 'hospital',
        parent: 'p1'
      };
      expect(() => assertPlaceInput(placeInput)).to.not.throw();
    });
  });

  describe('assertReportInput', () => {
    it('throws error for invalid report input with missing field `contact`', () => {
      const reportInput = {
        type: 'data_record',
        form: 'f1'
      };
      expect(() => assertReportInput(reportInput)).to.throw(
        InvalidArgumentError,
        `Invalid report type [${JSON.stringify(reportInput)}].`
      );
    });

    it('should not throw error for a valid report input', () => {
      const reportInput = {
        type: 'data_record',
        form: 'f1',
        contact: 'c1'
      };
      expect(() => assertReportInput(reportInput)).to.not.throw();
    });
  });
});
