import { expect } from 'chai';
import {
  AbstractDataContext,
  deepCopy,
  findById,
  getLastElement,
  getPagedGenerator,
  hasField,
  hasFields,
  isDataObject,
  isIdentifiable,
  isNonEmptyArray, isNormalizedParent,
  isRecord,
  isString,
  NonEmptyArray
} from '../../src/libs/core';
import sinon, { SinonStub } from 'sinon';
import * as Core from '../../src/libs/core';

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

  describe('getPagedGenerator', () => {
    let fetchFunctionStub: SinonStub;
    const limit = 100;
    const cursor = null;

    beforeEach(() => {
      fetchFunctionStub = sinon.stub();
    });

    it('yields document one by one', async () => {
      const mockDocs = [{ id: 1 }, { id: 2 }, { id: 3 }];
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

    it('should handle multiple pages',  async () => {
      const mockDoc = { id: 1 };
      const mockDocs1 = Array.from({ length: 100 }, () => ({ ...mockDoc }));
      const mockPage1 = { data: mockDocs1, cursor: '100' };
      const mockDocs2 = [{ id: 101 }];
      const mockPage2 = { data: mockDocs2, cursor };
      const extraArg = 'value';

      fetchFunctionStub.onFirstCall().resolves(mockPage1);
      fetchFunctionStub.onSecondCall().resolves(mockPage2);

      const generator = getPagedGenerator(fetchFunctionStub, extraArg);

      const results = [];
      for await (const doc of generator) {
        results.push(doc);
      }

      expect(results).to.deep.equal([...mockDocs1, ...mockDocs2]);
      expect(fetchFunctionStub.callCount).to.equal(2);
      expect(fetchFunctionStub.firstCall.args).to.deep.equal([extraArg, cursor, limit]);
      expect(fetchFunctionStub.secondCall.args).to.deep.equal([extraArg, (Number(cursor) + limit).toString(), limit]);
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
      [{ _id: 'my-id' }, true, true],
      [{ _id: 'my-id' }, false, false],
      [{ hello: 'my-id' }, true, false],
      [{ _id: 1 }, true, false],
      [{ _id: 'my-id', parent: 'hello' }, true, false],
      [{ _id: 'my-id', parent: null }, true, true],
      [{ _id: 'my-id', parent: { hello: 'world' } }, true, false],
      [{ _id: 'my-id', parent: { _id: 'parent-id' } }, true, true],
      [{ _id: 'my-id', parent: { _id: 'parent-id', parent: { hello: 'world' } } }, true, false],
      [{ _id: 'my-id', parent: { _id: 'parent-id', parent: { _id: 'grandparent-id' } } }, true, true],
    ] as [unknown, boolean, boolean][]).forEach(([value, dataObj, expected]) => {
      it(`evaluates ${JSON.stringify(value)}`, () => {
        isDataObject.returns(dataObj);
        expect(isNormalizedParent(value)).to.equal(expected);
      });
    });
  });
});
