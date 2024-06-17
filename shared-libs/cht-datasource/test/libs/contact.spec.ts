import { expect } from 'chai';
import { isNormalizedParent } from '../../src/libs/contact';
import sinon, { SinonStub } from 'sinon';
import * as Core from '../../src/libs/core';

describe('contact lib', () => {
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
