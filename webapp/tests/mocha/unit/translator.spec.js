const BootstrapTranslator = require('../../../src/js/bootstrapper/translator'),
      { expect } = require('chai');

const translationData = {
  en: {
    LOAD_ASSETS:   'Loading assets!',
    FETCH_INFO:    x => `Fetching info (${x} docs)!`,
    EN_ONLY:       'Yay!',
  },
  es: {
    LOAD_ASSETS:   'Cargando activos!',
    FETCH_INFO:    x => `Descarga de datos (${x} documentos)!`,
    ES_ONLY:      'Vamos!',
  },
};

describe('Bootstrap Translator', () => {
  it('Translate LOAD_ASSETS to English', () => {
    const translator = new BootstrapTranslator('en', translationData);
    expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.en.LOAD_ASSETS);
  });

  it('Translate defaults and setLocale to English', () => {
    const translator = new BootstrapTranslator(undefined, translationData);
    expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.en.LOAD_ASSETS);
    translator.setLocale('es');
    expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.es.LOAD_ASSETS);
  });

  it('Translate to Spanish', () => {
    const translator = new BootstrapTranslator('es', translationData);
    expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.es.LOAD_ASSETS);
  });

  it('Translate with embedded argument to Spanish', () => {
    const translator = new BootstrapTranslator('es', translationData);
    expect(translator.translate('FETCH_INFO', 35)).to.eq('Descarga de datos (35 documentos)!');
  });

  it('Missing translation falls back to English', () => {
    const translator = new BootstrapTranslator('es', translationData);
    expect(translator.translate('EN_ONLY')).to.eq(translationData.en.EN_ONLY);
  });

  it('Static definitions', () => {
    expect(BootstrapTranslator.FETCH_INFO).to.eq('FETCH_INFO');
  });

  describe('Error cases', () => {
    it('Non-existant key', () => {
      const translator = new BootstrapTranslator('es', translationData);
      expect(translator.translate('FOO')).to.eq('bootstrap.translator.FOO');
    });

    it('Undefined key', () => {
      const translator = new BootstrapTranslator('en', translationData);
      expect(translator.translate()).to.eq('bootstrap.translator.undefined');
    });

    it('Non-existant locale falls back to English', () => {
      const translator = new BootstrapTranslator('foo', translationData);
      expect(translator.translate('LOAD_ASSETS')).to.eq(translationData.en.LOAD_ASSETS);
    });
  });
});
