import sinon from 'sinon';
import { expect } from 'chai';
import * as MessageFormat from 'messageformat';
import { cloneDeep } from 'lodash-es';

import {
  TranslateMessageFormatCompilerProvider,
  TranslateParserProvider,
} from '@mm-providers/translate-utils.provider';

describe('TranslateUtils providers', () => {
  let provider;

  afterEach(() => {
    sinon.restore();
  });

  describe('Translate MessageFormat compiler provider', () => {
    describe('compile', () => {
      it('should initialize local messageFormat', () => {
        provider = new TranslateMessageFormatCompilerProvider();

        const compiled = provider.compile('the {value}', 'fr');

        expect(compiled.value).to.equal('the {value}');
        expect(compiled.fn).to.be.a('function');
        expect(compiled.fn({ value: 'thing' })).to.equal('the thing');
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
        const mfCompile = sinon.stub(MessageFormat.prototype, 'compile');
        mfCompile.callsFake((string) => () => `${string} compiled`);
        provider = new TranslateMessageFormatCompilerProvider();

        let result = provider.compile('a {thing}', 'en');
        expect(result.fn).to.be.a('function');
        expect(result.fn()).to.equal('a {thing} compiled');
        expect(result.value).to.equal('a {thing}');
        expect(mfCompile.callCount).to.equal(1);
        expect(mfCompile.args[0]).to.deep.equal(['a {thing}', 'en']);

        result = provider.compile('a {thing} or {other}', 'fr');
        expect(result.fn).to.be.a('function');
        expect(result.fn()).to.equal('a {thing} or {other} compiled');
        expect(result.value).to.equal('a {thing} or {other}');
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
    });

    describe('compile translations', () => {
      it('should compile every value', () => {
        const translations = {
          'a': 'a translation',
          'b': 'b translation',
          'c': 'c translation',
          'd': 'd translation',
        };
        provider = new TranslateMessageFormatCompilerProvider();
        sinon.stub(provider, 'compile').callsFake((translation) => `${translation} compiled`);

        const result = provider.compileTranslations(translations, 'the_lang');
        expect(result).to.deep.equal({
          'a': 'a translation compiled',
          'b': 'b translation compiled',
          'c': 'c translation compiled',
          'd': 'd translation compiled',
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

  describe('Translate Parser Provider', () => {
    beforeEach(() => {
      provider = new TranslateParserProvider();
    });

    describe('interpolate', () => {
      it('should do "standard" interpolation on values, using params', () => {
        expect(provider.interpolate('string')).to.equal('string');
        expect(provider.interpolate('{{string}}')).to.equal('{{string}}');
        expect(provider.interpolate('{{string}}', { string: 'ana' })).to.equal('ana');
        expect(
          provider.interpolate('{{one}}, {{two}}, {{three}}', { one: 1, two: 2, three: 3 })
        ).to.equal('1, 2, 3');
      });

      it('should catch errors with messageformat compiled values', () => {
        const fn = sinon.stub().throws(new Error('boom'));

        expect(provider.interpolate({ fn, value: 'the value' })).to.equal('the value');
        expect(provider.interpolate({ fn, value: 'the value' }, { the: 'param' })).to.equal('the value');
        expect(fn.callCount).to.equal(2);
        expect(fn.args).to.deep.equal([
          [ undefined ],
          [{ the: 'param' }],
        ]);
      });

      it('should return function from messageformat compiled value', () => {
        const fn = sinon.stub().returns('the compiled interpolated result');

        expect(provider.interpolate({ fn, value: 'the value' }))
          .to.equal('the compiled interpolated result');
        expect(provider.interpolate({ fn, value: 'the value' }, { the: 'params' }))
          .to.equal('the compiled interpolated result');
        expect(fn.callCount).to.equal(2);
        expect(fn.args).to.deep.equal([
          [ undefined ],
          [{ the: 'params' }],
        ]);
      });
    });

    describe('getValue', () => {
      it('should work with undefined / incorrect target and key', () => {
        expect(provider.getValue(undefined, undefined)).to.equal(undefined);
        expect(provider.getValue([], undefined)).to.equal(undefined);
        expect(provider.getValue({}, undefined)).to.equal(undefined);
        expect(provider.getValue('test', 'test')).to.equal(undefined);
        expect(provider.getValue('test', [])).to.equal(undefined);
        expect(provider.getValue([], [])).to.equal(undefined);
      });

      it('should return exact match first', () => {
        const translations = {
          'contact': {
            fn: () => 'messageformatkey',
            value: 'contact'
          },
          'contact.key': 'contact key',
          'contact.mark': 'contact mark',
          'person': {
            'last': 'last name',
            'first': 'first name',
          }
        };
        const clonedTranslations = cloneDeep(translations);
        const contactTranslation = provider.getValue(translations, 'contact');
        expect(contactTranslation.value).to.equal(clonedTranslations.contact.value);
        expect(contactTranslation.fn()).to.equal(clonedTranslations.contact.fn());
        expect(provider.getValue(translations, 'contact.key')).to.equal('contact key');
        expect(provider.getValue(translations, 'contact.mark')).to.equal('contact mark');
        expect(provider.getValue(translations, 'person.last')).to.equal('last name'); // this still works
        expect(provider.getValue(translations, 'person.first')).to.equal('first name'); // this still works
        expect(clonedTranslations).to.deep.equal(translations);
      });
    });
  });
});
