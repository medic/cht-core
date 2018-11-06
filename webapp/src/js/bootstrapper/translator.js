'use strict';

var eurodigit = require('eurodigit');

var TRANSLATIONS = {
  en: {
    FETCH_INFO: function(x) {
      return 'Fetching info (' + x + ' docs)…';
    },
    LOAD_APP: 'Loading app…',
    LOAD_RULES: 'Loading rules…',
    STARTING_APP: 'Starting app…',
    ERROR_MESSAGE: 'Loading error, please check your connection.',
    TRY_AGAIN: 'Try again',
  },
  es: {
    FETCH_INFO: function(x) {
      return 'Descargando datos (' + x + ' archivos)…';
    },
    LOAD_APP: 'Cargando aplicación…',
    LOAD_RULES: 'Cargando reglas…',
    STARTING_APP: 'Aplicación iniciando…',
    ERROR_MESSAGE: 'Error al cargar, por favor comprueba la conexión',
    TRY_AGAIN: 'Volver a intentar',
  },
  sw: {
    FETCH_INFO: function(x) {
      return 'Inakusanya jumbe (jumbe ' + x + ')…';
    },
    LOAD_APP: 'Inapakia programu…',
    LOAD_RULES: 'Inapakia kanuni…',
    ERROR_MESSAGE:
      'Kuna hitilafu katika kupakia, tafadhali hakikisha uko kwenye mtandao',
    TRY_AGAIN: 'Jaribu tena',
  },
  ne: {
    FETCH_INFO: function(x) {
      return eurodigit.to_non_euro.devanagari(
        'जानकारी प्राप्त गरिंदै छ (' + x + ' दस्तावेज़)…'
      );
    },
    LOAD_APP: 'एप लोड गर्दै…',
    LOAD_RULES: 'नियमहरू लोड गर्दै…',
    STARTING_APP: 'एप सुरु हुँदैछ…',
    ERROR_MESSAGE: 'लोडिंग त्रुटि, कृपया आफ्नो ईन्टरनेट कनेक्सन जाँच गर्नुहोस्',
    TRY_AGAIN: 'पुन: प्रयास गर्नुहोस्',
  },
  fr: {
    FETCH_INFO: function(x) {
      return 'Récupération des infos (' + x + ' docs)...';
    },
    LOAD_APP: 'Chargement de l’application…',
    LOAD_RULES: 'Chargement des paramètres…',
    STARTING_APP: 'App de démarrage…',
    ERROR_MESSAGE: 'Erreur de chargement, veuillez vérifier votre connexion',
    TRY_AGAIN: 'Réessayer',
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
    locale = loc && loc.split('_')[0];
  },
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  module.exports._setTranslationData = function(data) {
    translationData = data || TRANSLATIONS;
  };
}
