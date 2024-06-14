import { expect } from 'chai';
import {
  AbstractDataContext, deepCopy, findById, getLastElement,
  hasField,
  hasFields, isDataObject, isIdentifiable,
  isNonEmptyArray,
  isRecord,
  isString,
  NonEmptyArray
} from '../../src/libs/core';
import sinon from 'sinon';

describe('core lib', () => {
  afterEach(() => sinon.restore());

  describe('isNonEmptyArray', () => {
    ([
      [[], false],
      [[1], true],
      [[1, 2], true]
    ] as [unknown[], boolean][]).forEach(([value, expected]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isNonEmptyArray(value)).to.equal(expected);
      });
    });
  });

  describe('getLastElement', () => {
    ([
      [1, 2, 3],
      ['hello', 'world'],
    ] as NonEmptyArray<number | string>[]).forEach(value => {
      it(`returns the last element of ${JSON.stringify(value)}`, () => {
        expect(getLastElement(value)).to.equal(value[value.length - 1]);
      });
    });
  });

  describe('isDataObject', () => {
    [
      [null, false],
      [`hello`, false],
      [1, false],
      [{ }, true],
      [{ hello: null }, true],
      [{ hello: undefined }, true],
      [{ hello: 'world' }, true],
      [{ hello: 1 }, true],
      [{ hello: false }, true],
      [{ hello: new Date() }, true],
      [{ hello: ['world'] }, true],
      [{ hello: [['world']] }, true],
      [{ hello: [{ hello: 'world' }] }, true],
      [{ hello: [() => 'world'] }, false],
      [{ hello: { parent: 'world' } }, true],
      [{ hello: () => 'world' }, false],
      [{ hello: { parent: () => 'world' } }, false],
    ].forEach(([value, expected]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isDataObject(value)).to.equal(expected);
      });
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
      [1, 2, 3],
      { hello: 'world' },
      { hello: { nested: 'world', more: [1, 2], deep: { hello: 'world' } } },
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
      [null, false],
      ['', true],
      [{}, false],
      [undefined, false],
      [1, false],
      ['hello', true]
    ].forEach(([value, expected]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isString(value)).to.equal(expected);
      });
    });
  });

  describe('isRecord', () => {
    [
      [null, false],
      ['', false],
      [{}, true],
      [undefined, false],
      [1, false],
      ['hello', false]
    ].forEach(([value, expected]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isRecord(value)).to.equal(expected);
      });
    });
  });

  describe('hasField', () => {
    ([
      [{}, { name: 'uuid', type: 'string' }, false],
      [{ uuid: 'uuid' }, { name: 'uuid', type: 'string' }, true],
      [{ uuid: 'uuid' }, { name: 'uuid', type: 'number' }, false],
      [{ uuid: 'uuid', other: 1 }, { name: 'uuid', type: 'string' }, true],
      [{ uuid: 'uuid', other: 1 }, { name: 'other', type: 'string' }, false],
      [{ uuid: 'uuid', other: 1 }, { name: 'other', type: 'number' }, true],
      [{ getUuid: () => 'uuid' }, { name: 'getUuid', type: 'function' }, true],
    ] as [Record<string, unknown>, { name: string, type: string }, boolean][]).forEach(([record, field, expected]) => {
      it(`evaluates ${JSON.stringify(record)} with ${JSON.stringify(field)}`, () => {
        expect(hasField(record, field)).to.equal(expected);
      });
    });
  });

  describe('hasFields', () => {
    ([
      [{}, [{ name: 'uuid', type: 'string' }], false],
      [{ uuid: 'uuid' }, [{ name: 'uuid', type: 'string' }], true],
      [{ getUuid: () => 'uuid' }, [{ name: 'getUuid', type: 'function' }, { name: 'uuid', type: 'string' }], false],
      [
        { getUuid: () => 'uuid', uuid: 'uuid' },
        [{ name: 'getUuid', type: 'function' }, { name: 'uuid', type: 'string' }],
        true
      ],
    ] as [Record<string, unknown>, NonEmptyArray<{ name: string, type: string }>, boolean][]).forEach(
      ([record, fields, expected]) => {
        it(`evaluates ${JSON.stringify(record)} with ${JSON.stringify(fields)}`, () => {
          expect(hasFields(record, fields)).to.equal(expected);
        });
      }
    );
  });

  describe('isIdentifiable', () => {
    [
      [null, false],
      [{}, false],
      [{ _id: 'uuid' }, true],
      [{ _id: 'uuid', other: 1 }, true],
      [{ _id: 'uuid', getUuid: () => 'uuid' }, true],
    ].forEach(([value, expected]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        expect(isIdentifiable(value)).to.equal(expected);
      });
    });
  });

  describe('findById', () => {
    it('returns the entry with the matching _id value', () => {
      const match = { _id: 'uuid2' };
      const values = [{ _id: 'uuid0' }, { _id: 'uuid1' }, match];
      const result = findById(values, match._id);

      expect(result).to.equal(match);
    });

    it('returns null if no entry has a matching _id value', () => {
      const values = [{ _id: 'uuid0' }, { _id: 'uuid1' }, { _id: 'uuid2' }];
      const result = findById(values, 'uuid3');

      expect(result).to.be.null;
    });
  });

  describe('AbstractDataContext', () => {
    class TestDataContext extends AbstractDataContext { }

    it('bind', () => {
      const ctx = new TestDataContext();
      const testFn = sinon.stub().returns('test');

      const result = ctx.bind<string>(testFn);

      expect(result).to.equal('test');
      expect(testFn.calledOnceWithExactly(ctx)).to.be.true;
    });
  });
});
