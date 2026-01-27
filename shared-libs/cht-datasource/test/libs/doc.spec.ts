import { expect } from 'chai';
import { isDoc } from '../../src/libs/doc';

describe('doc lib', () => {
  describe('isDoc', () => {
    [
      [null, false],
      [{}, false],
      [{ _id: 'id' }, false],
      [{ _rev: 'rev' }, false],
      [{ _id: 'id', _rev: 'rev' }, true],
      [{ _id: 'id', _rev: 'rev', other: 'other' }, true]
    ].forEach(([doc, expected]) => {
      it(`evaluates ${JSON.stringify(doc)}`, () => {
        expect(isDoc(doc)).to.equal(expected);
      });
    });
  });
});
