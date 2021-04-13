const { expect } = require('chai');

const rewire = require('rewire');
const prepare = rewire('../../src/nools/definition-preparation');

describe('definition-preparation', () => {
  describe('deepCopy', () => {
    const deepCopy = prepare.__get__('deepCopy');

    it('shallow fields are copied', () => {
      const original = { foo: 'bar' };
      const copy = deepCopy(original);
      expect(copy).to.deep.eq({ foo: 'bar' });
      copy.foo = 'foo';
      expect(original).to.deep.eq({ foo: 'bar' });
    });

    it('deep fields are copied', () => {
      const original = { a: { foo: 'bar' } };
      const copy = deepCopy(original);
      expect(copy).to.deep.eq({ a: { foo: 'bar' } });
      copy.a.foo = 'foo';
      expect(original).to.deep.eq({ a: { foo: 'bar' } });
    });

    it('shallow arrays are copied', () => {
      const original = { a: ['b'] };
      const copy = deepCopy(original);
      expect(copy).to.deep.eq({ a: ['b'] });
      copy.a.push('foo');
      expect(original).to.deep.eq({ a: ['b'] });
    });

    it('deep arrays are copied', () => {
      const original = { a: { b: ['c'] } };
      const copy = deepCopy(original);
      expect(copy).to.deep.eq({ a: { b: ['c'] } });
      copy.a.b.push('foo');
      expect(original).to.deep.eq({ a: { b: ['c'] } });
    });

    it('object within array is deep copied', () => {
      const original = { a: [{ b: 'foo'}] };
      const copy = deepCopy(original);
      expect(copy).to.deep.eq({ a: [{ b: 'foo'}] });
      copy.a[0].b = 'bar';
      expect(original).to.deep.eq({ a: [{ b: 'foo'}] });
    });

    it('functions are copied', done => {
      const original = { a: { foo: done } };
      const copy = deepCopy(original);
      copy.a.foo();
    });

    it('handles undefined', () => {
      const copy = deepCopy(undefined);
      expect(copy).to.deep.eq({});
    });
  });

  describe('bindAllFunctionsToContext', () => {
    const bindAllFunctionsToContext = prepare.__get__('bindAllFunctionsToContext');

    it('shallow functions are bound', done => {
      const context = { foo: 'bar' };
      const obj = {
        foo: function() {
          expect(this.foo).to.eq('bar');
          expect(this).to.eq(context);
          done();
        },
      };

      bindAllFunctionsToContext(obj, context);
      obj.foo();
    });

    it('functions in objects in arrays are bound', done => {
      const context = { foo: 'bar' };
      const obj = {
        events: [{
          dueDate: function() {
            expect(this.foo).to.eq('bar');
            expect(this).to.eq(context);
            done();
          },
        }],
      };

      bindAllFunctionsToContext(obj, context);
      obj.events[0].dueDate();
    });

    it('deep functions are bound', done => {
      const context = { foo: 'bar' };
      const obj = {
        a: {
          foo: function() {
            expect(this.foo).to.eq('bar');
            expect(this).to.eq(context);
            done();
          },
        },
      };

      bindAllFunctionsToContext(obj, context);
      obj.a.foo();
    });
  });

});
