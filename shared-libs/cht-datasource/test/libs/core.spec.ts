import { expect } from 'chai';
import * as Core from '../../src/libs/core';
import {
  AbstractDataContext,
  assertDataObject,
  assertDoesNotHaveField,
  assertHasOptionalField,
  assertHasRequiredField,
  deepCopy,
  findById,
  getLastElement,
  getPagedGenerator,
  hasField,
  hasStringFieldWithValue,
  isDataObject,
  isDateTimeString,
  isIdentifiable,
  isNonEmptyArray,
  isNormalizedParent,
  isRecord,
  isString,
  NonEmptyArray,
} from '../../src/libs/core';
import sinon, { SinonStub } from 'sinon';

describe('core lib', () => {
  afterEach(() => sinon.restore());

  describe('isNonEmptyArray', () => {
    ([
      [ [], false ],
      [ [ 1 ], true ],
      [ [ 1, 2 ], true ]
    ] as [ unknown[], boolean ][]).forEach(([ value, expected ]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isNonEmptyArray(value)).to.equal(expected);
      });
    });
  });

  describe('getLastElement', () => {
    ([
      [ 1, 2, 3 ],
      [ 'hello', 'world' ],
    ] as NonEmptyArray<number | string>[]).forEach(value => {
      it(`returns the last element of ${JSON.stringify(value)}`, () => {
        expect(getLastElement(value)).to.equal(value[value.length - 1]);
      });
    });
  });

  describe('isDataObject', () => {
    [
      [ null, false ],
      [ `hello`, false ],
      [ 1, false ],
      [ {}, true ],
      [ { hello: null }, true ],
      [ { hello: undefined }, true ],
      [ { hello: 'world' }, true ],
      [ { hello: 1 }, true ],
      [ { hello: false }, true ],
      [ { hello: new Date() }, true ],
      [ { hello: [ 'world' ] }, true ],
      [ { hello: [ [ 'world' ] ] }, true ],
      [ { hello: [ { hello: 'world' } ] }, true ],
      [ { hello: [ () => 'world' ] }, false ],
      [ { hello: { parent: 'world' } }, true ],
      [ { hello: () => 'world' }, false ],
      [ { hello: { parent: () => 'world' } }, false ],
    ].forEach(([ value, expected ]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isDataObject(value)).to.equal(expected);
      });
    });
  });

  describe('assertDataObject', () => {
    it('does not throw for valid DataObject', () => {
      expect(() => assertDataObject({ hello: 'world' })).to.not.throw();
    });

    it('throws for non-DataObject', () => {
      expect(() => assertDataObject(null)).to.throw(Error, 'Not a valid JSON object value.');
    });

    it('throws with custom error class', () => {
      class CustomError extends Error {}
      expect(() => assertDataObject('invalid', CustomError)).to.throw(CustomError, 'Not a valid JSON object value.');
    });
  });

  describe('deepCopy', () => {
    [
      'hello',
      1,
      null
    ].forEach(value => {
      it(`copies ${JSON.stringify(value)}`, () => {
        expect(deepCopy(value)).to.equal(value);
      });
    });

    [
      [ 1, 2, 3 ],
      { hello: 'world' },
      { hello: { nested: 'world', more: [ 1, 2 ], deep: { hello: 'world' } } },
    ].forEach(value => {
      it(`copies ${JSON.stringify(value)}`, () => {
        expect(deepCopy(value)).to.not.equal(value);
        expect(deepCopy(value)).to.deep.equal(value);
      });
    });

    it('eliminates cross-references from within an object', () => {
      const innerObject = { hello: 'world' };
      const outerObject = { first: innerObject, second: innerObject };

      const copied = deepCopy(outerObject);

      expect(copied).to.deep.equal(outerObject);
      expect(copied.first).to.not.equal(copied.second);
    });
  });

  describe('isString', () => {
    [
      [ null, false ],
      [ '', true ],
      [ {}, false ],
      [ undefined, false ],
      [ 1, false ],
      [ 'hello', true ]
    ].forEach(([ value, expected ]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isString(value)).to.equal(expected);
      });
    });
  });

  describe('isDateTimeString', () => {
    [
      [ '2024-01-01', true ],
      [ '2024-01-01T00:00:00Z', true ],
      [ '2024-01-01T00:00:00.000Z', true ],
      [ 'not-a-date', false ],
      [ 'yesterday', false ],
      [ '', false ],
      [ 123, false ],
      [ null, false ],
      [ undefined, false ],
      [ {}, false ],
    ].forEach(([ value, expected ]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isDateTimeString(value)).to.equal(expected);
      });
    });
  });

  describe('isRecord', () => {
    [
      [ null, false ],
      [ '', false ],
      [ {}, true ],
      [ undefined, false ],
      [ 1, false ],
      [ 'hello', false ]
    ].forEach(([ value, expected ]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isRecord(value)).to.equal(expected);
      });
    });
  });

  describe('hasField', () => {
    type FieldType = 'string' | 'number' | 'boolean' | 'function' | 'object';
    ([
      [ {}, { name: 'uuid', type: 'string' }, false ],
      [ { uuid: 'uuid' }, { name: 'uuid', type: 'string' }, true ],
      [ { uuid: 'uuid' }, { name: 'uuid', type: 'number' }, false ],
      [ { uuid: 'uuid', other: 1 }, { name: 'uuid', type: 'string' }, true ],
      [ { uuid: 'uuid', other: 1 }, { name: 'other', type: 'string' }, false ],
      [ { uuid: 'uuid', other: 1 }, { name: 'other', type: 'number' }, true ],
      [ { getUuid: () => 'uuid' }, { name: 'getUuid', type: 'function' }, true ],
      [ { created: { year: 2024 } }, { name: 'created', type: 'object' }, true ],
      [ { created: 'not-object' }, { name: 'created', type: 'object' }, false ],
    ] as [ Record<string, unknown>, {
      name: string,
      type: FieldType
    }, boolean ][]).forEach(([ record, field, expected ]) => {
      it(`evaluates ${JSON.stringify(record)} with ${JSON.stringify(field)}`, () => {
        expect(hasField(record, field)).to.equal(expected);
      });
    });
  });

  describe('hasStringFieldWithValue', () => {
    ([
      [ {}, 'uuid', false ],
      [ { uuid: 'value' }, 'uuid', true ],
      [ { uuid: '' }, 'uuid', false ],
      [ { uuid: '   ' }, 'uuid', false ],
      [ { uuid: '  trimmed  ' }, 'uuid', true ],
      [ { uuid: 123 }, 'uuid', false ],
    ] as [ Record<string, unknown>, string, boolean ][]).forEach(([ record, fieldName, expected ]) => {
      it(`evaluates ${JSON.stringify(record)} with field "${fieldName}"`, () => {
        expect(hasStringFieldWithValue(record, fieldName)).to.equal(expected);
      });
    });
  });

  describe('assertDoesNotHaveField', () => {
    it('does not throw when field is undefined', () => {
      expect(() => assertDoesNotHaveField({}, 'field')).to.not.throw();
    });

    it('does not throw when field is null', () => {
      expect(() => assertDoesNotHaveField({ field: null }, 'field')).to.not.throw();
    });

    it('throws when field has a value', () => {
      expect(() => assertDoesNotHaveField({ field: 'value' }, 'field'))
        .to.throw(Error, 'The [field] field must not be set.');
    });

    it('throws with custom error class', () => {
      class CustomError extends Error {}
      expect(() => assertDoesNotHaveField({ field: 123 }, 'field', CustomError))
        .to.throw(CustomError, 'The [field] field must not be set.');
    });
  });

  describe('assertHasOptionalField', () => {
    it('does not throw when field is not present', () => {
      expect(() => assertHasOptionalField({}, { name: 'field', type: 'string' })).to.not.throw();
    });

    it('does not throw when field has correct type', () => {
      expect(() => assertHasOptionalField({ field: 'value' }, { name: 'field', type: 'string' })).to.not.throw();
    });

    it('throws when field has wrong type', () => {
      expect(() => assertHasOptionalField({ field: 123 }, { name: 'field', type: 'string' }))
        .to.throw(Error, 'The [field] field must have the type [string].');
    });

    it('throws with custom error class', () => {
      class CustomError extends Error {}
      expect(() => assertHasOptionalField({ field: 'value' }, { name: 'field', type: 'number' }, CustomError))
        .to.throw(CustomError, 'The [field] field must have the type [number].');
    });
  });

  describe('assertHasRequiredField', () => {
    it('does not throw when field has correct type and value', () => {
      expect(() => assertHasRequiredField({ field: 'value' }, { name: 'field', type: 'string' })).to.not.throw();
    });

    it('throws when field is missing', () => {
      expect(() => assertHasRequiredField({}, { name: 'field', type: 'string' }))
        .to.throw(Error, 'The [field] field must have a [string] value.');
    });

    it('throws when field has wrong type', () => {
      expect(() => assertHasRequiredField({ field: 123 }, { name: 'field', type: 'string' }))
        .to.throw(Error, 'The [field] field must have a [string] value.');
    });

    it('throws when field is empty string', () => {
      expect(() => assertHasRequiredField({ field: '' }, { name: 'field', type: 'string' }))
        .to.throw(Error, 'The [field] field must have a [string] value.');
    });

    it('throws with custom error class', () => {
      class CustomError extends Error {}
      expect(() => assertHasRequiredField({}, { name: 'field', type: 'string' }, CustomError))
        .to.throw(CustomError, 'The [field] field must have a [string] value.');
    });
  });

  describe('isIdentifiable', () => {
    [
      [ null, false ],
      [ {}, false ],
      [ { _id: 'uuid' }, true ],
      [ { _id: 'uuid', other: 1 }, true ],
      [ { _id: 'uuid', getUuid: () => 'uuid' }, true ],
      [ { _id: '' }, false ],
      [ { _id: '   ' }, false ],
    ].forEach(([ value, expected ]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isIdentifiable(value)).to.equal(expected);
      });
    });
  });

  describe('findById', () => {
    it('returns the entry with the matching _id value', () => {
      const match = { _id: 'uuid2' };
      const values = [ { _id: 'uuid0' }, { _id: 'uuid1' }, match ];
      const result = findById(values, match._id);

      expect(result).to.equal(match);
    });

    it('returns null if no entry has a matching _id value', () => {
      const values = [ { _id: 'uuid0' }, { _id: 'uuid1' }, { _id: 'uuid2' } ];
      const result = findById(values, 'uuid3');

      expect(result).to.be.null;
    });
  });

  describe('AbstractDataContext', () => {
    class TestDataContext extends AbstractDataContext {
    }

    it('bind', () => {
      const ctx = new TestDataContext();
      const testFn = sinon.stub().returns('test');

      const result = ctx.bind<string>(testFn);

      expect(result).to.equal('test');
      expect(testFn.calledOnceWithExactly(ctx)).to.be.true;
    });
  });

  describe('getPagedGenerator', () => {
    let fetchFunctionStub: SinonStub;
    const limit = 100;
    const cursor = null;

    beforeEach(() => {
      fetchFunctionStub = sinon.stub();
    });

    it('yields document one by one', async () => {
      const mockDocs = [ { id: 1 }, { id: 2 }, { id: 3 } ];
      const mockPage = { data: mockDocs, cursor };
      const extraArg = 'value';
      fetchFunctionStub.resolves(mockPage);

      const generator = getPagedGenerator(fetchFunctionStub, extraArg);

      const results = [];

      for await (const doc of generator) {
        results.push(doc);
      }

      expect(results).to.deep.equal(mockDocs);
      expect(fetchFunctionStub.calledOnceWithExactly(extraArg, cursor, limit)).to.be.true;
    });

    it('should handle multiple pages', async () => {
      const mockDoc = { id: 1 };
      const mockDocs1 = Array.from({ length: 100 }, () => ({ ...mockDoc }));
      const mockPage1 = { data: mockDocs1, cursor: '100' };
      const mockDocs2 = [ { id: 101 } ];
      const mockPage2 = { data: mockDocs2, cursor };
      const extraArg = 'value';

      fetchFunctionStub.onFirstCall().resolves(mockPage1);
      fetchFunctionStub.onSecondCall().resolves(mockPage2);

      const generator = getPagedGenerator(fetchFunctionStub, extraArg);

      const results = [];
      for await (const doc of generator) {
        results.push(doc);
      }

      expect(results).to.deep.equal([ ...mockDocs1, ...mockDocs2 ]);
      expect(fetchFunctionStub.callCount).to.equal(2);
      expect(fetchFunctionStub.firstCall.args).to.deep.equal([ extraArg, cursor, limit ]);
      expect(fetchFunctionStub.secondCall.args).to.deep.equal([ extraArg, (Number(cursor) + limit).toString(), limit ]);
    });

    it('should handle empty result', async () => {
      fetchFunctionStub.resolves({ data: [], cursor });

      const generator = getPagedGenerator(fetchFunctionStub, { limit: 10, cursor });

      const result = await generator.next();

      expect(result.done).to.be.true;
      expect(result.value).to.be.equal(null);
      expect(fetchFunctionStub.calledOnce).to.be.true;
    });
  });

  describe('isNormalizedParent', () => {
    let isDataObject: SinonStub;

    beforeEach(() => isDataObject = sinon.stub(Core, 'isDataObject'));
    afterEach(() => sinon.restore());

    ([
      [ { _id: 'my-id' }, true, true ],
      [ { _id: 'my-id' }, false, false ],
      [ { hello: 'my-id' }, true, false ],
      [ { _id: 1 }, true, false ],
      [ { _id: 'my-id', parent: 'hello' }, true, false ],
      [ { _id: 'my-id', parent: null }, true, true ],
      [ { _id: 'my-id', parent: { hello: 'world' } }, true, false ],
      [ { _id: 'my-id', parent: { _id: 'parent-id' } }, true, true ],
      [ { _id: 'my-id', parent: { _id: 'parent-id', parent: { hello: 'world' } } }, true, false ],
      [ { _id: 'my-id', parent: { _id: 'parent-id', parent: { _id: 'grandparent-id' } } }, true, true ],
    ] as [ unknown, boolean, boolean ][]).forEach(([ value, dataObj, expected ]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        isDataObject.returns(dataObj);
        expect(isNormalizedParent(value)).to.equal(expected);
      });
    });
  });

});
