import { expect } from 'chai';
import { getProperty, hasProperty } from '../../../../src/ts/libs/schema';

describe('Schema', () => {
  describe('hasProperty', () => {
    it('returns true if the object has the property', () => {
      expect(hasProperty({ foo: 'bar' }, 'foo')).to.be.true;
    });

    [
      null,
      undefined,
      'foo',
      1,
      true,
      [],
      {},
      { bar: 'foo' }
    ].forEach((value) => {
      it(`returns false if the object does not have the property: ${value}`, () => {
        expect(hasProperty(value, 'foo')).to.be.false;
      });
    });
  });

  describe('getProperty', () => {
    it('returns the property value if the object has the property', () => {
      expect(getProperty({ foo: 'bar' }, 'foo')).to.equal('bar');
    });

    [
      null,
      undefined,
      'foo',
      1,
      true,
      [],
      {},
      { bar: 'foo' }
    ].forEach((value) => {
      it(`returns undefined if the object does not have the property: ${value}`, () => {
        expect(getProperty(value, 'foo')).to.be.undefined;
      });
    });
  });
});
