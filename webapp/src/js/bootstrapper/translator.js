'use strict';

var TRANSLATIONS = {
  en: {
    FETCH_INFO: function(x) {
      return 'Fetching info (' + x + ' docs)…';
    },
    LOAD_RULES: 'Loading rules…',
    ERROR_MESSAGE: 'Loading error, please check your connection.',
    TRY_AGAIN: 'Try again',
  },
};

var locale;
var translationData = TRANSLATIONS;

module.exports = {
  translate: function translate(key, arg) {
    var lookup =
      (locale && translationData[locale] && translationData[locale][key]) ||
      translationData.en[key] ||
      'bootstrap.translator.' + (key || 'undefined');
  
    if (typeof lookup === 'function') {
      lookup = lookup(arg) || 'bootstrap.translator.error';
    }
  
    return lookup;
  },

  setLocale: function setLocale(loc) {
    locale = loc;
  },
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  module.exports._setTranslationData = function(data) {
    translationData = data ? data : TRANSLATIONS;
  };
}
