'use strict';

const eurodigit = require('eurodigit');

/* eslint-disable max-len */
const TRANSLATIONS = {
  en: {
    FETCH_INFO: ({ count, total }) => `Fetching info (${count} of ${total} docs )…`,
    LOAD_APP: 'Loading app…',
    PURGE_INIT: 'Checking data…',
    PURGE_INFO: ({ count }) => `Cleaned ${count} documents…`,
    PURGE_META: 'Cleaning metadata…',
    STARTING_APP: 'Starting app…',
    DOWNLOAD_APP: 'Downloading app…',
    ERROR_MESSAGE: 'Loading error, please check your connection.',
    TRY_AGAIN: 'Try again',
    POLL_REPLICATION: 'Polling replication data…',
    TOO_MANY_DOCS: ({ count, limit }) => `Warning! You are about to download ${count} docs, which exceeds recommended limit of ${limit}. Do you wish to continue?`,
    CONTINUE: 'Continue',
    ABORT: 'Cancel',
    SESSION_EXPIRED_TITLE: 'Session has expired',
    SESSION_EXPIRED_DESCRIPTION: 'Your session has expired and you have been logged out. Please login to continue.',
    LOGIN: 'Login',
  },
  es: {
    FETCH_INFO: ({ count, total }) => `Obteniendo información (${count} de ${total} docs)…`,
    LOAD_APP: 'Cargando aplicación…',
    PURGE_INIT: 'Verificación de datos…',
    PURGE_INFO: ({ count }) => `Limpiado ${count} documentos…`,
    PURGE_META: 'Limpieza de metadatos…',
    STARTING_APP: 'Aplicación iniciando…',
    DOWNLOAD_APP: 'Descargando aplicación…',
    ERROR_MESSAGE: 'Error al cargar, por favor comprueba la conexión',
    TRY_AGAIN: 'Volver a intentar',
    POLL_REPLICATION: 'Obteniendo datos de replicación…',
    TOO_MANY_DOCS: ({ count, limit }) => `¡Advertencia! Va a descargar ${count} documentos, que excede el límite recomendado de ${limit}. ¿Desea continuar?`,
    CONTINUE: 'Continuar',
    ABORT: 'Cancelar',
    SESSION_EXPIRED_TITLE: 'La sesión ha expirado',
    SESSION_EXPIRED_DESCRIPTION: 'Su sesión ha expirado y usted ha sido desconectado. Por favor inicie sesión para continuar.',
    LOGIN: 'Iniciar sesión',
  },
  sw: {
    FETCH_INFO: ({ count, total }) => `Inachukua habari (${count} of ${total})…`,
    LOAD_APP: 'Inapakia programu…',
    PURGE_INIT: 'Kuangalia takwimu…',
    PURGE_INFO: ({ count }) => `Imesafisha hati ${count}…`,
    PURGE_META: 'inasafisha metadata…',
    STARTING_APP: 'Programu yaanza…',
    DOWNLOAD_APP: 'Kupakua programu…',
    ERROR_MESSAGE: 'Kuna hitilafu katika kupakia, tafadhali hakikisha uko kwenye mtandao',
    TRY_AGAIN: 'Jaribu tena',
    POLL_REPLICATION: 'Kuandika data ya kujaza…',
    TOO_MANY_DOCS: ({ count, limit }) => `Onyo! Uko karibu kupakua hati ${count}, ambazo zinazidi kikomo kilichopendekezwa cha ${limit}. Je! Unataka kuendelea?`,
    CONTINUE: 'Endelea',
    ABORT: 'Sitisha',
    SESSION_EXPIRED_TITLE: 'Kipindi kimeisha',
    SESSION_EXPIRED_DESCRIPTION: 'Kipindi chako kimeisha na umeondolewa.Tafadhali ingia ili uendelee.',
    LOGIN: 'Ingia',
  },
  ne: {
    FETCH_INFO: ({ count, total }) => eurodigit.to_non_euro.devanagari(`${total} मध्ये ${count} डकुमेन्ट लोड हुँदै  …`),
    LOAD_APP: 'एप लोड गर्दै…',
    PURGE_INIT: 'डाटा जाँच गर्दै…',
    PURGE_INFO: ({ count }) => eurodigit.to_non_euro.devanagari(`${count} वटा डकुमेन्ट सफा गरीयो…`),
    PURGE_META: 'मेटा डाटा सफा गर्दै…',
    STARTING_APP: 'एप सुरु हुँदैछ…',
    DOWNLOAD_APP: 'ऐप डाउनलोड गर्दै…',
    ERROR_MESSAGE: 'लोडिंग त्रुटि, कृपया आफ्नो ईन्टरनेट कनेक्सन जाँच गर्नुहोस्',
    TRY_AGAIN: 'पुन: प्रयास गर्नुहोस्',
    POLL_REPLICATION: 'रिप्लिकेसन डाटा चेक गर्दै…',
    TOO_MANY_DOCS: ({ count, limit }) => eurodigit.to_non_euro.devanagari(`सावधान! तपाई ${count} डकुमेन्ट डाउनलोड गर्न जाँदै हुनुहुन्छ, जुन कि सुझावित ${limit} भन्दा बढी छ. के तपाई डाउनलोड गर्न चाहनु हुन्छ?`),
    CONTINUE: 'जारी राख्नुस',
    ABORT: 'बन्द गर्नुस',
    SESSION_EXPIRED_TITLE: 'अघिल्लो सत्रको म्याद सकियो',
    SESSION_EXPIRED_DESCRIPTION: 'तपाईको सेशन समाप्त भएको छ र तपाई लग आउट हुनुभएको छ। जारी राख्न कृपया लगइन गर्नुहोस्।',
    LOGIN: 'लगिन',
  },
  fr: {
    FETCH_INFO: ({ count, total }) => `Récupération des données  (${count} sur ${total} documents)…`,
    LOAD_APP: 'Chargement de l’application…',
    PURGE_INIT: 'Vérification des données…',
    PURGE_INFO: ({ count }) => `${count} document(s) nettoyé(s)…`,
    PURGE_META: 'Cleaning meta data…',
    STARTING_APP: 'App de démarrage…',
    DOWNLOAD_APP: 'Téléchargement de l\'app en cours…',
    ERROR_MESSAGE: 'Erreur de chargement, veuillez vérifier votre connexion',
    TRY_AGAIN: 'Réessayer',
    POLL_REPLICATION: 'Examen de la réplication des données…',
    TOO_MANY_DOCS: ({ count, limit }) => `Attention ! Vous êtes sur le point de télécharger ${count} documents, ce qui dépasse la limite recommandée de ${limit}. Souhaitez-vous continuer ?`,
    CONTINUE: 'Continuer',
    ABORT: 'Annuler',
    SESSION_EXPIRED_TITLE: 'Session expirée',
    SESSION_EXPIRED_DESCRIPTION: 'Votre session a expiré et vous avez été déconnecté. Veuillez vous connecter pour continuer.',
    LOGIN: 'Connexion',
  },
  hi: {
    FETCH_INFO: ({ count, total }) => `डॉक्युमेंट लोड हो रहें हैं (${total} मेंस से ${count})…`,
    LOAD_APP: 'एप्लीकेशन लोड हो रही है…',
    PURGE_INIT: 'डेटा की जाँच…',
    PURGE_INFO: ({ count }) => `${count} दस्तावेज साफ किए…`,
    PURGE_META: 'Nettoyage des métadonnées…',
    STARTING_APP: 'ऐप शुरी की जा रही है…',
    DOWNLOAD_APP: 'एप डाउनलोड हो रही है…',
    ERROR_MESSAGE: 'लोडिंग में त्रुटि, कृपया अपना कनेक्शन जांचें।',
    TRY_AGAIN: 'पुन: प्रयास करें',
    POLL_REPLICATION: ' प्रतिकृति डेटा चेक हो रहा है…',
    TOO_MANY_DOCS: ({ count, limit }) => `चेतावनी! आप ${count} डॉक्स डाउनलोड करने वाले हैं, जो ${limit} की अनुशंसित सीमा से अधिक है। क्या आप  डाउनलोड जारी रखना चाहते हैं?`,
    CONTINUE: 'जारी रखें',
    ABORT: 'रद्द करें',
    SESSION_EXPIRED_TITLE: 'सेशुन समाप्त हो चुका है',
    SESSION_EXPIRED_DESCRIPTION: 'आपका सेशन समाप्त हो गया है और आप लॉग आउट हो गए हैं। जारी रखने के लिए कृपया लॉगिन करें।',
    LOGIN: 'लॉग',
  },
  id: {
    FETCH_INFO: ({ count, total }) => `Mengambil informasi (${count} dari ${total} dokumen)…`,
    LOAD_APP: 'Memuat aplikasi…',
    PURGE_INIT: 'Mengecek data…',
    PURGE_INFO: ({ count }) => `Menghapus ${count} dokument…`,
    PURGE_META: 'Menghapus metadata…',
    STARTING_APP: 'Memulai aplikasi…',
    DOWNLOAD_APP: 'Mengunduh aplikasi…',
    ERROR_MESSAGE: 'Terjadi kendala dalam memuat, tolong cek koneksi internet Anda.',
    TRY_AGAIN: 'Coba lagi',
    POLL_REPLICATION: 'Menyalin data ke perangkat Anda…',
    TOO_MANY_DOCS: ({ count, limit }) => `Peringatan! Anda akan mengunduh ${count} dokumen, yang melebihi rekomendasi batasan ${limit}. Apakah Anda ingin melanjutkan?`,
    CONTINUE: 'Lanjutkan',
    ABORT: 'Batal',
    SESSION_EXPIRED_TITLE: 'Sesi kadalursa',
    SESSION_EXPIRED_DESCRIPTION: 'Sesi Anda telah berakhir dan Anda telah keluar. Silakan masuk kembali untuk melanjutkan.',
    LOGIN: 'Login',
  },
};
/* eslint-enable max-len */

let locale;
let translationData = TRANSLATIONS;

module.exports = {
  translate: function translate(key, args) {
    let lookup =
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
  module.exports._getTranslationData = function() {
    return TRANSLATIONS;
  };
}
