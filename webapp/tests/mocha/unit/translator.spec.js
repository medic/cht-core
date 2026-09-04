const translator = require('../../../src/js/bootstrapper/translator');
const { expect } = require('chai');

const translationData = {
  en: {
    LOAD_ASSETS: 'Loading assets!',
    FETCH_INFO: x => `Fetching info (${x} docs)!`,
    FETCH_FORMS: ({ count, total }) => `Fetching (${count} of ${total} forms)!`,
    EN_ONLY: 'Yay!',
  },
  es: {
    LOAD_ASSETS: 'Cargando activos!',
    FETCH_INFO: x => `Descarga de datos (${x} documentos)!`,
    FETCH_FORMS: ({ count, total }) => `Descargando (${count} de ${total} formularios)!`,
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

  it('Translate with object argument', () => {
    translator.setLocale('en');
    expect(translator.translate('FETCH_FORMS', { count: 2, total: 5 })).to.eq('Fetching (2 of 5 forms)!');
    translator.setLocale('es');
    expect(translator.translate('FETCH_FORMS', { count: 2, total: 5 })).to.eq('Descargando (2 de 5 formularios)!');
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

  it('FETCH_FORMS renders count and total in every locale', () => {
    translator._setTranslationData();
    const data = translator._getTranslationData();

    Object.keys(data).forEach(locale => {
      translator.setLocale(locale);
      const translated = translator.translate('FETCH_FORMS', { count: 3, total: 12 });
      expect(translated, `"${locale}" FETCH_FORMS`).to.be.a('string')
        .and.to.include('3')
        .and.to.include('12')
        .and.to.not.include('undefined');
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
