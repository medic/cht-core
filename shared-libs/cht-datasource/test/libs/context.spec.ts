import { expect } from 'chai';
import {
  assertDataContext
} from '../../src/libs/context';

describe('context lib', () => {
  describe('assertDataContext', () => {
    it('successfully asserts a data context', () => {
      expect(() => assertDataContext({ medicDb: {}, settings: {} })).to.not.throw();
    });

    [
      null,
      1,
      'hello'
    ].forEach((context) => {
      it(`throws an error if the data context is invalid [${JSON.stringify(context)}]`, () => {
        expect(() => assertDataContext(context)).to.throw(`Invalid data context [${JSON.stringify(context)}].`);
      });
    });
  });
});
