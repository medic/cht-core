'use strict';

const TRANSLATIONS = {
  en: {
    LOAD_APP:      'Loading app…',
    FETCH_INFO:    x => `Fetching info (${x} docs)…`,
    LOAD_RULES:    'Loading rules…',
    ERROR_MESSAGE: 'Loading error, please check your connection.',
    TRY_AGAIN:     'Try again',
  },
  es: {
    LOAD_RULES:    'Reglas de carga…',
    FETCH_INFO:    x => `Descarga de datos (${x} documentos)…`,
  },
};

function Translator(locale, translationData) {  
  this.translationData = translationData || TRANSLATIONS;

  Translator.prototype.setLocale = function setLocale(locale) {
    this.locale = locale;
  };
  this.setLocale(locale);

  Translator.prototype.translate = function translate(key, arg) {
    const locale = this.locale;
    const translationData = this.translationData;

    let lookup =
      (locale && translationData[locale] && translationData[locale][key]) || 
      translationData['en'][key] ||
      `bootstrap.translator.${key || 'undefined'}`;

    if (typeof lookup === 'function') {
      lookup = lookup(arg) || 'bootstrap.translator.error';
    }
    
    return lookup;
  };
}

// Defines and exports Translator.LOAD_ASSETS as static public constants
Object.keys(TRANSLATIONS.en).forEach(key => Translator[key] = key);

module.exports = Translator;
