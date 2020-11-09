import sinon from 'sinon';
import { expect } from 'chai';
import * as MessageFormat from 'messageformat';

import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-message-format-compiler.provider';
import { exitCodeFromResult } from '@angular/compiler-cli';

let service;

describe('Translate MessageFormat compiler provider', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('compile', () => {
    it('should initialize local messageFormat', () => {
      service = new TranslateMessageFormatCompilerProvider();
      const compiled = service.compile('the {value}', 'fr');
      console.log(compiled);
      expect(compiled).to.be.a('function');
      expect(compiled({ value: 'thing' })).to.equal('the thing');
    });

    it('should not pass double open curly braces or no curly braces strings to message format', () => {
      const mfCompile = sinon.stub(MessageFormat.prototype, 'compile');
      service = new TranslateMessageFormatCompilerProvider();
      expect(service.compile('the {{value}}')).to.equal('the {{value}}');
      expect(mfCompile.callCount).to.equal(0);
      expect(service.compile('the value')).to.equal('the value');
      expect(mfCompile.callCount).to.equal(0);
      expect(service.compile('{{a value')).to.equal('{{a value');
      expect(mfCompile.callCount).to.equal(0);
      expect(service.compile('{{some}} other {value}')).to.equal('{{some}} other {value}');
      expect(mfCompile.callCount).to.equal(0);
    });

    it('should pass single open curly braces strings to message format', () => {
      const mfCompile = sinon.stub(MessageFormat.prototype, 'compile');
      mfCompile.callsFake((string) => () => `${string} compiled`);
      service = new TranslateMessageFormatCompilerProvider();

      expect(service.compile('a {thing}', 'en')()).to.equal('a {thing} compiled');
      expect(mfCompile.callCount).to.equal(1);
      expect(mfCompile.args[0]).to.deep.equal(['a {thing}', 'en']);
      expect(service.compile('a {thing} or {other}', 'fr')()).to.equal('a {thing} or {other} compiled');
      expect(mfCompile.callCount).to.equal(2);
      expect(mfCompile.args[1]).to.deep.equal(['a {thing} or {other}', 'fr']);
    });

    it('should catch message format throwing errors', () => {
      const mfCompile = sinon.stub(MessageFormat.prototype, 'compile').throws({ some: 'error' });
      service = new TranslateMessageFormatCompilerProvider();
      expect(service.compile('a {thing}')).to.equal('a {thing}');
      expect(mfCompile.callCount).to.equal(1);
    });
  });

  describe('compile translations', () => {
    it('should compile every value', () => {
      const translations = {
        'a': 'a translation',
        'b': 'b translation',
        'c': 'c translation',
        'd': 'd translation',
      };
      service = new TranslateMessageFormatCompilerProvider();
      sinon.stub(service, 'compile').callsFake((translation) => `${translation} compiled`);
      const result = service.compileTranslations(translations, 'the_lang');
      expect(result).to.deep.equal({
        'a': 'a translation compiled',
        'b': 'b translation compiled',
        'c': 'c translation compiled',
        'd': 'd translation compiled',
      });
      expect(service.compile.callCount).to.equal(4);
      expect(service.compile.args).to.deep.equal([
        ['a translation', 'the_lang'],
        ['b translation', 'the_lang'],
        ['c translation', 'the_lang'],
        ['d translation', 'the_lang'],
      ]);
    });
  });
});
