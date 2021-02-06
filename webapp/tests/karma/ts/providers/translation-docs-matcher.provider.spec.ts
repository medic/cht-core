import { expect } from 'chai';

import { TranslationDocsMatcherProvider } from '@mm-providers/translation-docs-matcher.provider';

describe('TranslationDocsMatcherProvider service', () => {
  const service = TranslationDocsMatcherProvider;

  describe('test method', () => {
    it('should return false when not matching', () => {
      expect(service.test()).to.equal(undefined);
      expect(service.test([])).to.equal(false);
      expect(service.test({})).to.equal(false);
      expect(service.test(100)).to.equal(false);
      expect(service.test('04aa1bfa-f87d-467e-bf46-51eeb367370b')).to.equal(false);
      expect(service.test('messages-')).to.equal(false);
    });

    it('should return true when matching', () => {
      expect(service.test('messages-en')).to.equal(true);
      expect(service.test('messages-fr')).to.equal(true);
      expect(service.test('messages-any')).to.equal(true);
    });
  });

  describe('getLocaleCode', () => {
    it('should return false when not matching', () => {
      expect(service.getLocaleCode()).to.equal(false);
      expect(service.getLocaleCode([])).to.equal(null);
      expect(service.getLocaleCode({})).to.equal(null);
      expect(service.getLocaleCode(100)).to.equal(null);
      expect(service.getLocaleCode('04aa1bfa-f87d-467e-bf46-51eeb367370b')).to.equal(null);
      expect(service.getLocaleCode('messages-')).to.equal(null);
    });

    it('should return code when matching', () => {
      expect(service.getLocaleCode('messages-en')).to.equal('en');
      expect(service.getLocaleCode('messages-fr')).to.equal('fr');
      expect(service.getLocaleCode('messages-any')).to.equal('any');
    });
  });

  describe('getTranslationsDocId', () => {
    it('should return correct value', () => {
      expect(service.getTranslationsDocId('code')).to.equal('messages-code');
      expect(service.getTranslationsDocId('fr')).to.equal('messages-fr');
      expect(service.getTranslationsDocId(123)).to.equal('messages-123');
      expect(service.getTranslationsDocId('')).to.equal(false);
      expect(service.getTranslationsDocId()).to.equal(false);
    });
  });
});
