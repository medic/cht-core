import sinon from 'sinon';
import { expect } from 'chai';
import MessageFormat from '@messageformat/core';

import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-messageformat-compiler.provider';

describe('Translate MessageFormat compiler provider', () => {
  let provider;

  afterEach(() => {
    sinon.restore();
  });

  describe('compile', () => {
    it('should initialize local messageFormat', () => {
      provider = new TranslateMessageFormatCompilerProvider();

      const compiled = provider.compile('the {value}', 'fr');
      expect(compiled).to.be.a('function');
      expect(compiled({ value: 'thing' })).to.equal('the thing');
    });

    it('should not pass double open curly braces or no curly braces strings to message format', () => {
      const mfCompile = sinon.stub(MessageFormat.prototype, 'compile');
      provider = new TranslateMessageFormatCompilerProvider();

      expect(provider.compile('the {{value}}')).to.equal('the {{value}}');
      expect(mfCompile.callCount).to.equal(0);

      expect(provider.compile('the value')).to.equal('the value');
      expect(mfCompile.callCount).to.equal(0);

      expect(provider.compile('{{a value')).to.equal('{{a value');
      expect(mfCompile.callCount).to.equal(0);

      expect(provider.compile('{{some}} other {value}')).to.equal('{{some}} other {value}');
      expect(mfCompile.callCount).to.equal(0);
    });

    it('should pass single open curly braces strings to message format', () => {
      sinon.stub(console, 'error');
      const mfCompile = sinon.stub(MessageFormat.prototype, 'compile');
      mfCompile.callsFake((string) => () => `${string} compiled`);
      provider = new TranslateMessageFormatCompilerProvider();

      let result = provider.compile('a {thing}', 'en');
      expect(result).to.be.a('function');
      expect(result()).to.equal('a {thing} compiled');
      expect(mfCompile.callCount).to.equal(1);
      expect(mfCompile.args[0]).to.deep.equal(['a {thing}', 'en']);

      result = provider.compile('a {thing} or {other}', 'fr');
      expect(result).to.be.a('function');
      expect(result()).to.equal('a {thing} or {other} compiled');
      expect(mfCompile.callCount).to.equal(2);
      expect(mfCompile.args[1]).to.deep.equal(['a {thing} or {other}', 'fr']);

      mfCompile.withArgs('a {thing').throws(new Error('boom'));
      result = provider.compile('a {thing', 'es');
      expect(result).to.equal('a {thing');
      expect(mfCompile.callCount).to.equal(3);
      expect(mfCompile.args[2]).to.deep.equal(['a {thing', 'es']);
    });

    it('should catch message format throwing errors', () => {
      const mfCompile = sinon.stub(MessageFormat.prototype, 'compile').throws({ some: 'error' });
      const consoleErrorMock = sinon.stub(console, 'error');
      provider = new TranslateMessageFormatCompilerProvider();

      expect(provider.compile('a {thing}')).to.equal('a {thing}');
      expect(mfCompile.callCount).to.equal(1);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('messageformat compile error');
    });

    it('should catch messageformat interpolation errors', () => {
      const compiled = sinon.stub().throws({ error: 'Boom' });
      const mfCompile = sinon.stub(MessageFormat.prototype, 'compile').returns(compiled);

      sinon.stub(console, 'error');
      provider = new TranslateMessageFormatCompilerProvider();

      const result = provider.compile('a {thing}');
      expect(result).to.be.a('function');
      expect(result()).to.equal('a {thing}');
      expect(result({ param: true })).to.equal('a {thing}');
      expect(result(false)).to.equal('a {thing}');
      expect(mfCompile.callCount).to.equal(1); // expression was only compiled once!
      expect(compiled.callCount).to.equal(3);
      expect(compiled.args).to.deep.equal([ [undefined], [{ param: true }], [false] ]);
    });
  });

  describe('compile translations', () => {
    it('should compile every value', () => {
      const translations = {
        a: 'a translation',
        b: 'b translation',
        c: 'c translation',
        d: 'd translation',
      };
      provider = new TranslateMessageFormatCompilerProvider();
      sinon.stub(provider, 'compile').callsFake((translation) => `${translation} compiled`);

      const result = provider.compileTranslations(translations, 'the_lang');
      expect(result).to.deep.equal({
        a: 'a translation compiled',
        b: 'b translation compiled',
        c: 'c translation compiled',
        d: 'd translation compiled',
      });
      expect(provider.compile.callCount).to.equal(4);
      expect(provider.compile.args).to.deep.equal([
        ['a translation', 'the_lang'],
        ['b translation', 'the_lang'],
        ['c translation', 'the_lang'],
        ['d translation', 'the_lang'],
      ]);
    });
  });
});
