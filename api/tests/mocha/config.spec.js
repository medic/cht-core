const chai = require('chai');
const sinon = require('sinon');
const config = require('../../src/config');

describe('Config', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('translate', () => {

    describe('with object key', () => {

      it('finds requested locale', () => {
        const given = { translations: [
          { locale: 'en', content: 'english' },
          { locale: 'fr', content: 'french' }
        ] };
        const actual = config.translate(given, 'fr');
        chai.expect(actual).to.equal('french');
      });

      it('uses provided default', () => {
        const given = { default: 'def', translations: [
          { locale: 'en', content: 'english' },
          { locale: 'fr', content: 'french' }
        ] };
        const actual = config.translate(given, 'xx');
        chai.expect(actual).to.equal('def');
      });

      it('defaults to english', () => {
        const given = { translations: [
          { locale: 'fr', content: 'french' },
          { locale: 'en', content: 'english' }
        ] };
        const actual = config.translate(given, 'xx');
        chai.expect(actual).to.equal('english');
      });

      it('returns first available language', () => {
        const given = { translations: [
          { locale: 'es', content: 'spanish' },
          { locale: 'fr', content: 'french' }
        ] };
        const actual = config.translate(given, 'xx');
        chai.expect(actual).to.equal('spanish');
      });

    });

    describe('with string key', () => {

      beforeEach(() => {
        config.setTranslationCache({
          'en': {
            'test.key': 'english value',
            'test.key2': 'another value',
            'templated': 'hello {{name}}'
          },
          'fr': {
            'test.key': 'french value'
          },
        });
      });

      it('returns key when no value found', () => {
        const actual = config.translate('not-found');
        chai.expect(actual).to.equal('not-found');
      });

      it('defaults to english when no locale given or configured', () => {
        const actual = config.translate('test.key');
        chai.expect(actual).to.equal('english value');
      });

      it('defaults to english when given locale not found', () => {
        const actual = config.translate('test.key', 'xx');
        chai.expect(actual).to.equal('english value');
      });

      it('defaults to english when local value not found', () => {
        const actual = config.translate('test.key2');
        chai.expect(actual).to.equal('another value');
      });

      it('returns requested locale when available', () => {
        const actual = config.translate('test.key', 'fr');
        chai.expect(actual).to.equal('french value');
      });

      it('templates value using the context', () => {
        const actual = config.translate('templated', 'en', { name: 'jones' });
        chai.expect(actual).to.equal('hello jones');
      });

      it('handles templating errors from missing variables', () => {
        const actual = config.translate('templated', 'en', { });
        chai.expect(actual).to.equal('hello {{name}}');
      });

    });

  });

  describe('getTranslations', () => {

    beforeEach(() => {
      config.setTranslationCache({
        'en': {
          'test.key': 'english value',
          'test.key2': 'another value',
          'test.key3': 'third value'
        },
        'fr': {
          'test.key': 'french value'
        },
      });
    });

    it('returns map of values for given keys for all locales', () => {
      const actual = config.getTranslations([ 'test.key', 'test.key2' ]);
      chai.expect(actual).to.deep.equal({
        'fr': {
          'test.key': 'french value',
          'test.key2': undefined
        },
        'en': {
          'test.key': 'english value',
          'test.key2': 'another value'
        }
      });
    });

  });

});
