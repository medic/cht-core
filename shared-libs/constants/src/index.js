// Shared constants for CHT-Core
// This library provides a single source of truth for magic strings and constants used throughout the application

// Document IDs
const DOC_IDS = {
  SERVICE_WORKER_META: 'service-worker-meta',
  SETTINGS: 'settings',
  RESOURCES: 'resources',
  PRIVACY_POLICIES: 'privacy-policies',
  PARTNERS: 'partners',
  BRANDING: 'branding',
};

// Contact Types
const CONTACT_TYPES = {
  HEALTH_CENTER: 'health_center',
};

// Document Types
const DOC_TYPES = {
  TOKEN_LOGIN: 'token_login',
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
  PURGE_LOG: '_local/purge_log',
  PURGE_DB_INFO: '_local/info',
  LEGACY_META_DATA: '_local/sentinel-meta-data',
};

// User Roles
const USER_ROLES = {
  ONLINE: 'mm-online',
  ADMIN: 'admin',
  COUCHDB_ADMIN: '_admin',
};

module.exports = {
  DOC_IDS,
  DOC_TYPES,
  HTTP_HEADERS,
  SENTINEL_METADATA,
  USER_ROLES,
  CONTACT_TYPES,
};
