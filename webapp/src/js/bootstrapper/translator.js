'use strict';

var eurodigit = require('eurodigit');

var TRANSLATIONS = {
  en: {
    FETCH_INFO: ({ count }) => `Fetching info (${count} docs)…`,
    LOAD_APP: 'Loading app…',
    PURGE_INIT: 'Checking data…',
    PURGE_INFO: ({ count, percent }) => `Cleaned ${count} documents (${percent}% complete)…`,
    LOAD_RULES: 'Loading rules…',
    STARTING_APP: 'Starting app…',
    ERROR_MESSAGE: 'Loading error, please check your connection.',
    TRY_AGAIN: 'Try again',
  },
  es: {
    FETCH_INFO: ({ count }) => `Descargando datos (${count} archivos)…`,
    LOAD_APP: 'Cargando aplicación…',
    PURGE_INIT: 'Verificación de datos…',
    PURGE_INFO: ({ count, percent }) => `Limpiado ${count} documentos (${percent}% completo)…`,
    LOAD_RULES: 'Cargando reglas…',
    STARTING_APP: 'Aplicación iniciando…',
    ERROR_MESSAGE: 'Error al cargar, por favor comprueba la conexión',
    TRY_AGAIN: 'Volver a intentar',
  },
  sw: {
    FETCH_INFO: ({ count }) => `Inakusanya jumbe (jumbe ${count})…`,
    LOAD_APP: 'Inapakia programu…',
    PURGE_INIT: 'Kuangalia takwimu…',
    PURGE_INFO: ({ count, percent }) => `Imesafisha hati ${count} (Asilimia ${percent} imekamilika)…`,
    LOAD_RULES: 'Inapakia kanuni…',
    ERROR_MESSAGE: 'Kuna hitilafu katika kupakia, tafadhali hakikisha uko kwenye mtandao',
    TRY_AGAIN: 'Jaribu tena',
  },
  ne: {
    FETCH_INFO: ({ count }) => {
      return eurodigit.to_non_euro.devanagari(
        `जानकारी प्राप्त गरिंदै छ (${count} दस्तावेज़)…`
      );
    },
    LOAD_APP: 'एप लोड गर्दै…',
    PURGE_INIT: 'डाटा जाँच गर्दै…',
    PURGE_INFO: ({ count, percent }) => `${count} वटा डकुमेन्ट सफा गरीयो (${percent}% कार्य सम्पन्न)…`,
    LOAD_RULES: 'नियमहरू लोड गर्दै…',
    STARTING_APP: 'एप सुरु हुँदैछ…',
    ERROR_MESSAGE: 'लोडिंग त्रुटि, कृपया आफ्नो ईन्टरनेट कनेक्सन जाँच गर्नुहोस्',
    TRY_AGAIN: 'पुन: प्रयास गर्नुहोस्',
  },
  fr: {
    FETCH_INFO: ({ count }) => `Récupération des infos (${count} docs)…`,
    LOAD_APP: 'Chargement de l’application…',
    PURGE_INIT: 'Vérification des données…',
    PURGE_INFO: ({ count, percent }) => `${count} document(s) nettoyé(s) [${percent}% terminé(s)]…`,
    LOAD_RULES: 'Chargement des paramètres…',
    STARTING_APP: 'App de démarrage…',
    ERROR_MESSAGE: 'Erreur de chargement, veuillez vérifier votre connexion',
    TRY_AGAIN: 'Réessayer',
  },
  hi: {
    FETCH_INFO: ({ count }) => `जानकारी ढूंदी जा रहीं हैं (${count} दस्तावेज)…`,
    LOAD_APP: 'एप्लीकेशन लोड हो रही है…',
    PURGE_INIT: 'डेटा की जाँच…',
    PURGE_INFO: ({ count, percent }) => `${count} दस्तावेज साफ किए (${percent}% पूर्ण)…`,
    LOAD_RULES: 'नियम लोड हो रहें हैं…',
    STARTING_APP: 'ऐप शुरी की जा रही है…',
    ERROR_MESSAGE: 'लोडिंग में त्रुटि, कृपया अपना कनेक्शन जांचें।',
    TRY_AGAIN: 'पुन: प्रयास करें',
  },
};

var locale;
var translationData = TRANSLATIONS;

module.exports = {
  translate: function translate(key, args) {
    var lookup =
      (locale && translationData[locale] && translationData[locale][key]) ||
      translationData.en[key] ||
      'bootstrap.translator.' + (key || 'undefined');

    if (typeof lookup === 'function') {
      lookup = lookup(args) || 'bootstrap.translator.error';
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
