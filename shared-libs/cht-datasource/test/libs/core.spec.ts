import { expect } from 'chai';
import { AbstractDataContext, hasField, hasFields, isRecord, isString, NonEmptyArray } from '../../src/libs/core';
import sinon from 'sinon';

describe('core lib', () => {
  afterEach(() => sinon.restore());

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
