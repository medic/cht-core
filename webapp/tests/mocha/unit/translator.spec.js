const translator = require('../../../src/ts/bootstrapper/translator');
const { expect } = require('chai');

const translationData = {
  en: {
    LOAD_ASSETS: 'Loading assets!',
    FETCH_INFO: x => `Fetching info (${x} docs)!`,
    EN_ONLY: 'Yay!',
  },
  es: {
    LOAD_ASSETS: 'Cargando activos!',
    FETCH_INFO: x => `Descarga de datos (${x} documentos)!`,
  },
};

describe('Bootstrap Translator', () => {
  beforeEach(() => {
    translator.setLocale(undefined);
    translator._setTranslationData(translationData);
  });

  it('Translate LOAD_ASSETS to English', () => {
    translator.setLocale('en');
    expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.en.LOAD_ASSETS);
  });

  it('Translate defaults and setLocale to English', () => {
    expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.en.LOAD_ASSETS);
    translator.setLocale('es_EU');
    expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.es.LOAD_ASSETS);
  });

  it('Translate to Spanish', () => {
    translator.setLocale('es');
    expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.es.LOAD_ASSETS);
  });

  it('Translate with embedded argument to Spanish', () => {
    translator.setLocale('es');
    expect(translator.translate('FETCH_INFO', 35)).to.eq('Descarga de datos (35 documentos)!');
  });

  it('Missing translation falls back to English', () => {
    translator.setLocale('es');
    expect(translator.translate('EN_ONLY')).to.eq(translationData.en.EN_ONLY);
  });

  describe('Error cases', () => {
    it('Non-existant key', () => {
      translator.setLocale('es');
      expect(translator.translate('FOO')).to.eq('bootstrap.translator.FOO');
    });

    it('Non-existant locale falls back to English', () => {
      translator.setLocale('foo');
      expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.en.LOAD_ASSETS);
    });
  });

  it('All translations provided', () => {

    // reset translation data
    translator._setTranslationData();

    const data = translator._getTranslationData();
    const locales = Object.keys(data);

    // gather all known translation keys
    const keys = new Set();
    locales.forEach(locale => {
      Object.keys(data[locale]).forEach(key => keys.add(key));
    });

    // assert all locales have all keys
    locales.forEach(locale => {
      keys.forEach(key => {
        expect(data[locale][key], `Bootstrap translator data: "${locale}" is missing "${key}"`).to.not.be.undefined;
      });
    });
  });
});
