//import { async } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';
import * as moment from 'moment';

import { ParseProvider } from '@mm-providers/parse.provider';
import { pipe } from 'rxjs';
import { DatePipe } from '@angular/common';

describe('Parse provider', () => {
  let provider:ParseProvider;
  let pipesService;

  afterEach(() => sinon.restore());

  const parse = (expression, context?, locals?) => {
    return provider.parse(expression)(context, locals);
  };

  describe('without pipes', () => {
    beforeEach(() => {
      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map()),
        meta: sinon.stub(),
        getInstance: sinon.stub(),
      };
      provider = new ParseProvider(pipesService);
    });

    it('should handle simple expressions', () => {
      expect(parse('1+1')).to.equal(2);
      expect(parse('5*8')).to.equal(40);
      expect(parse('200-100')).to.equal(100);
    });

    it('should crash when parser throws', () => {
      let result;
      try {
        result = parse('2 ===== 3');
        assert.fail('should have thrown');
      } catch (e) {
        expect(e.message.startsWith('Parser Error: Unexpected token')).to.equal(true);
        expect(result).to.equal(undefined);
      }
    });

    it('should handle context', () => {
      const context = {
        array: [1, 2, 3, 4, 5, 6, 7],
        isEven: (nbr) => nbr % 2 === 0,
        isOdd: (nbr) => nbr % 2 !== 0,
      };
      expect(parse('isOdd(array[0])', context)).to.equal(true);
      expect(parse('isOdd(array[1])', context)).to.equal(false);
      expect(parse('isEven(array[5])', context)).to.equal(true);
      expect(parse('isEven(array[6])', context)).to.equal(false);
    });

    it('should handle locals and context', () => {
      const context = {
        joinComma: array => array.join(','),
        joinSpace: array => array.join(' '),
      };
      const locals = {
        array: ['hello', 'world', '!']
      };
      expect(parse('joinComma(array)', context, locals)).to.equal('hello,world,!');
      expect(parse('joinSpace(array)', context, locals)).to.equal('hello world !');
    });

    it('should overwrite context with locals', () => {
      const context = {
        array1: [1, 2, 3],
        array2: [4, 5, 6],
      };
      const locals = {
        array1: [7, 8, 9],
      };
      expect(parse('array1.concat(array2)', context, locals)).to.deep.equal([7, 8, 9, 4, 5, 6]);
      expect(parse('array2.concat(array1)', context, locals)).to.deep.equal([4, 5, 6, 7, 8, 9]);
    });
  });

  describe('with pipes', () => {
    beforeEach(() => {
      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map()),
        meta: sinon.stub(),
        getInstance: sinon.stub(),
      };
    });

    it('should work with built-in date', () => {
      pipesService = {
        getPipeNameVsIsPureMap: sinon.stub().returns(new Map([['date', { pure: true }]])),
        meta: sinon.stub().returns({ pure: true }),
        getInstance: sinon.stub().returns(new DatePipe('en')),
      }
      provider = new ParseProvider(pipesService);
      const date = moment('2020-01-01').valueOf();
      expect(parse(`${date} | date:'d-m-Y'`)()).to.equal('aaa');
    });
  });
});
