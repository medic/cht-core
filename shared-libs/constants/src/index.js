// Shared constants for CHT-Core
// This library provides a single source of truth for magic strings and constants used throughout the application

// Document IDs
const DOC_IDS = {
  SERVICE_WORKER_META: 'service-worker-meta',
  BRANDING: 'branding',
  EXTENSION_LIBS: 'extension-libs',
};

// Document Types
const DOC_TYPES = {
  TRANSLATIONS: 'translations',
};

// HTTP Headers
const HTTP_HEADERS = {
  REQUEST_ID: 'X-Request-Id',
};

// Sentinel Metadata
const SENTINEL_METADATA = {
  TRANSITIONS_SEQ: '_local/transitions-seq',
  BACKGROUND_SEQ: '_local/background-seq',
};

// User Roles
const USER_ROLES = {
  ONLINE: 'mm-online',
};

const DOC_IDS_PREFIX =  {
  DDOC: '_design/',
  FORM: 'form:',
  TRANSLATIONS: 'messages-'
};

module.exports = {
  DOC_IDS,
  DOC_IDS_PREFIX,
  DOC_TYPES,
  HTTP_HEADERS,
  SENTINEL_METADATA,
  USER_ROLES,
};
