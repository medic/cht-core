import { expect } from 'chai';
import sinon from 'sinon';
import configLib from '../../../../src/ts/libs/config';

describe('config', () => {
  describe('getValueFromFunction', () => {
    let consoleTrace: sinon.SinonStub;

    beforeEach(() => {
      consoleTrace = sinon.stub(console, 'trace');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('returns undefined when input is undefined', () => {
      const result = configLib.getValueFromFunction(undefined);
      expect(result).to.be.undefined;
      expect(consoleTrace.called).to.be.false;
    });

    it('returns empty string when input is empty string', () => {
      const result = configLib.getValueFromFunction('');
      expect(result).to.equal('');
      expect(consoleTrace.called).to.be.false;
    });

    it('returns original string when it is not a valid function expression', () => {
      const result = configLib.getValueFromFunction('just a regular string');
      expect(result).to.equal('just a regular string');
      expect(consoleTrace.called).to.be.true;
    });

    it('returns original string when evaluated result is not a function', () => {
      const result = configLib.getValueFromFunction('42');
      expect(result).to.equal('42');
      expect(consoleTrace.called).to.be.false;
    });

    it('returns original string when evaluated result is an object', () => {
      const result = configLib.getValueFromFunction('({ key: "value" })');
      expect(result).to.equal('({ key: "value" })');
      expect(consoleTrace.called).to.be.false;
    });

    it('evaluates a function with no arguments', () => {
      const result = configLib.getValueFromFunction('() => "hello"');
      expect(result).to.equal('hello');
      expect(consoleTrace.called).to.be.false;
    });

    it('evaluates a function with arguments', () => {
      const result = configLib.getValueFromFunction('(a, b) => a + b', 2, 3);
      expect(result).to.equal(5);
      expect(consoleTrace.called).to.be.false;
    });

    it('evaluates a function that returns a computed string', () => {
      const result = configLib.getValueFromFunction('(name) => `Hello, ${name}!`', 'World');
      expect(result).to.equal('Hello, World!');
      expect(consoleTrace.called).to.be.false;
    });

    it('evaluates traditional function syntax', () => {
      const result = configLib.getValueFromFunction('function(x) { return x * 2; }', 5);
      expect(result).to.equal(10);
      expect(consoleTrace.called).to.be.false;
    });

    it('logs error and returns original string when function throws', () => {
      const fnString = '() => { throw new Error("test error"); }';
      const result = configLib.getValueFromFunction(fnString);
      expect(result).to.equal(fnString);
      expect(consoleTrace.called).to.be.true;
    });

    it('handles syntax errors gracefully', () => {
      const invalidSyntax = 'function { invalid }';
      const result = configLib.getValueFromFunction(invalidSyntax);
      expect(result).to.equal(invalidSyntax);
      expect(consoleTrace.called).to.be.true;
    });

    it('handles function returning undefined', () => {
      const result = configLib.getValueFromFunction('() => undefined');
      expect(result).to.be.undefined;
      expect(consoleTrace.called).to.be.false;
    });

    it('handles function returning null', () => {
      const result = configLib.getValueFromFunction('() => null');
      expect(result).to.be.null;
      expect(consoleTrace.called).to.be.false;
    });

    it('handles function returning empty string', () => {
      const result = configLib.getValueFromFunction('() => ""');
      expect(result).to.equal('');
      expect(consoleTrace.called).to.be.false;
    });
  });
});
