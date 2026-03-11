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
          .that.includes('The limit must be a positive integer');
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
    const personInput = {
      name: 'apoorva',
      type: 'person',
      parent: 'p1',
    } as const;

    [
      personInput,
      { ...personInput, reported_date: 1769526124 },
      { ...personInput, reported_date: '2026-01-27T14:34:48.333Z' },
      { ...personInput, reported_date: '2026-01-27T14:34:48Z' },
      { ...personInput, date_of_birth: '2000-06-15' },
      { ...personInput, date_of_birth: '2000-06-15T00:00:00Z' },
      { ...personInput, date_of_birth: new Date() },
      {
        ...personInput,
        reported_date: 1769526124,
        date_of_birth: '2000-06-15',
        phone: '1234567890',
        patient_id: '444',
        sex: 'female',
        custom_field: 'hello world',
      }
    ].forEach((input) => {
      it('should not throw error for a valid person input', () => {
        expect(() => assertPersonInput(input)).to.not.throw();
      });
    });

    it('throws error for input that is not a data object', () => {
      expect(() => assertPersonInput('person')).to.throw(
        InvalidArgumentError,
        'Not a valid JSON object value.'
      );
    });

    [
      'type',
      'name',
      'parent'
    ].forEach((requiredField) => {
      it(`throws error for missing required field [${requiredField}]`, () => {
        const input = { ...personInput, [requiredField]: undefined };
        expect(() => assertPersonInput(input)).to.throw(
          InvalidArgumentError,
          `The [${requiredField}] field must have a [string] value.`
        );
      });
    });

    it('throws error for invalid person input with invalid reported_date', () => {
      const input = { ...personInput, reported_date: 'last august' };
      expect(() => assertPersonInput(input)).to.throw(
        InvalidArgumentError,
        `Invalid reported_date. Expected format to be ` +
        '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.'
      );
    });

    [
      '_id',
      '_rev',
    ].forEach((requiredField) => {
      it(`throws error for having banned field [${requiredField}]`, () => {
        const input = { ...personInput, [requiredField]: 'hello' };
        expect(() => assertPersonInput(input)).to.throw(
          InvalidArgumentError,
          `The [${requiredField}] field must not be set.`
        );
      });
    });

    ([
      ['phone', 'string', 1],
      ['patient_id', 'string', new Date()],
      ['sex', 'string', true],
    ] as [string, string, unknown][]).forEach(([requiredField, type, value]: [string, string, unknown]) => {
      it(`throws error for optional field [${requiredField}] with invalid value`, () => {
        const input = { ...personInput, [requiredField]: value };
        expect(() => assertPersonInput(input)).to.throw(
          InvalidArgumentError,
          `The [${requiredField}] field must have the type [${type}].`
        );
      });
    });

    [
      'yesterday',
      'not-a-date',
      123,
      true,
    ].forEach((value) => {
      it(`throws error for date_of_birth with invalid value [${JSON.stringify(value)}]`, () => {
        const input = { ...personInput, date_of_birth: value };
        expect(() => assertPersonInput(input)).to.throw(
          InvalidArgumentError,
          'The [date_of_birth] field must have a [date] value.'
        );
      });
    });
  });

  describe('assertPlaceInput', () => {
    const placeInput = {
      name: 'h1',
      type: 'district_hospital'
    } as const;

    [
      placeInput,
      { ...placeInput, reported_date: 1769526124 },
      { ...placeInput, reported_date: '2026-01-27T14:34:48.333Z' },
      { ...placeInput, reported_date: '2026-01-27T14:34:48Z' },
      {
        ...placeInput,
        reported_date: 1769526124,
        parent: 'p1',
        contact: 'c1',
        place_id: 'plc-123',
        custom_field: 'hello world',
      }
    ].forEach((input) => {
      it('should not throw error for a valid place input', () => {
        expect(() => assertPlaceInput(input)).to.not.throw();
      });
    });

    it('throws error for input that is not a data object', () => {
      expect(() => assertPlaceInput('place')).to.throw(
        InvalidArgumentError,
        'Not a valid JSON object value.'
      );
    });

    [
      'type',
      'name'
    ].forEach((requiredField) => {
      it(`throws error for missing required field [${requiredField}]`, () => {
        const input = { ...placeInput, [requiredField]: undefined };
        expect(() => assertPlaceInput(input)).to.throw(
          InvalidArgumentError,
          `The [${requiredField}] field must have a [string] value.`
        );
      });
    });

    it('throws error for invalid place input with invalid reported_date', () => {
      const input = { ...placeInput, reported_date: 'last august' };
      expect(() => assertPlaceInput(input)).to.throw(
        InvalidArgumentError,
        `Invalid reported_date. Expected format to be ` +
        '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.'
      );
    });

    [
      '_id',
      '_rev',
    ].forEach((requiredField) => {
      it(`throws error for having banned field [${requiredField}]`, () => {
        const input = { ...placeInput, [requiredField]: 'hello' };
        expect(() => assertPlaceInput(input)).to.throw(
          InvalidArgumentError,
          `The [${requiredField}] field must not be set.`
        );
      });
    });

    ([
      ['parent', 'string', 1],
      ['place_id', 'string', new Date()],
      ['contact', 'string', true],
    ] as [string, string, unknown][]).forEach(([requiredField, type, value]: [string, string, unknown]) => {
      it(`throws error for optional field [${requiredField}] with invalid value`, () => {
        const input = { ...placeInput, [requiredField]: value };
        expect(() => assertPlaceInput(input)).to.throw(
          InvalidArgumentError,
          `The [${requiredField}] field must have the type [${type}].`
        );
      });
    });
  });

  describe('assertReportInput', () => {
    const reportInput = {
      contact: 'c1',
      form: 'f1'
    } as const;

    [
      reportInput,
      { ...reportInput, reported_date: 1769526124 },
      { ...reportInput, reported_date: '2026-01-27T14:34:48.333Z' },
      { ...reportInput, reported_date: '2026-01-27T14:34:48Z' },
      {
        ...reportInput,
        reported_date: 1769526124,
        type: 'data_record',
        custom_field: 'hello world',
      }
    ].forEach((input) => {
      it('should not throw error for a valid place input', () => {
        expect(() => assertReportInput(input)).to.not.throw();
      });
    });

    it('throws error for input that is not a data object', () => {
      expect(() => assertReportInput('report')).to.throw(
        InvalidArgumentError,
        'Not a valid JSON object value.'
      );
    });

    [
      'form',
      'contact'
    ].forEach((requiredField) => {
      it(`throws error for missing required field [${requiredField}]`, () => {
        const input = { ...reportInput, [requiredField]: undefined };
        expect(() => assertReportInput(input)).to.throw(
          InvalidArgumentError,
          `The [${requiredField}] field must have a [string] value.`
        );
      });
    });

    it('throws error for invalid report input with invalid reported_date', () => {
      const input = { ...reportInput, reported_date: 'last august' };
      expect(() => assertReportInput(input)).to.throw(
        InvalidArgumentError,
        `Invalid reported_date. Expected format to be ` +
        '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.'
      );
    });

    [
      '_id',
      '_rev',
    ].forEach((requiredField) => {
      it(`throws error for having banned field [${requiredField}]`, () => {
        const input = { ...reportInput, [requiredField]: 'hello' };
        expect(() => assertReportInput(input)).to.throw(
          InvalidArgumentError,
          `The [${requiredField}] field must not be set.`
        );
      });
    });

    it('throws error for optional field [type] with invalid value', () => {
      const input = { ...reportInput, type: 'data' };
      expect(() => assertReportInput(input)).to.throw(
        InvalidArgumentError,
        `Report type must be "data_record".`
      );
    });
  });
});
