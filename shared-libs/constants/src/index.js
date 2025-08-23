// shared-libs/constants/src/index.js
module.exports = {
  // Headers
  X_REQUEST_ID: 'X-Request-Id',
  X_MEDIC_SERVICE: 'X-Medic-Service',

  // Flags / states
  MM_ONLINE: 'mm-online',

  // Local DB seq docs
  LOCAL_TRANSITIONS_SEQ: '_local/transitions-seq',
  LOCAL_BACKGROUND_SEQ: '_local/background-seq',

  // Doc types / ids
  DOC_TYPE_TRANSLATIONS: 'translations',
  DOC_ID_SERVICE_WORKER_META: 'service-worker-meta',

  // Helpers
  translationDoc: (code) => `messages-${code}`,
  couchUser: (username) => `org.couchdb.user:${username}`
};
