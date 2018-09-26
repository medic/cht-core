'use strict';

var TRANSLATIONS = {
  en: {
    LOAD_APP:      'Loading app…',
    FETCH_INFO:    function (x) { return 'Fetching info (' + x + ' docs)…'; },
    LOAD_RULES:    'Loading rules…',
    ERROR_MESSAGE: 'Loading error, please check your connection.',
    TRY_AGAIN:     'Try again',
  }
};

function Translator(locale, translationData) {  
  this.translationData = translationData || TRANSLATIONS;

  Translator.prototype.setLocale = function setLocale(locale) {
    this.locale = locale;
  };
  this.setLocale(locale);

  Translator.prototype.translate = function translate(key, arg) {
    var locale = this.locale;
    var translationData = this.translationData;

    var lookup =
      (locale && translationData[locale] && translationData[locale][key]) || 
      translationData.en[key] ||
      'bootstrap.translator.' + (key || 'undefined');

    if (typeof lookup === 'function') {
      lookup = lookup(arg) || 'bootstrap.translator.error';
    }
    
    return lookup;
  };
}

// Exposes keys from Translations (eg. Translator.LOAD_ASSETS) as static public
Object.keys(TRANSLATIONS.en).forEach(function (key) {
  Translator[key] = key;
});

module.exports = Translator;
