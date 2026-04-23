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
  MIGRATION_LOG: 'migration-log',
  EXTENSION_LIBS: 'extension-libs',
  ZSCORE_CHARTS: 'zscore-charts',
};

// Contact Types
const CONTACT_TYPES = {
  HEALTH_CENTER: 'health_center',
  DISTRICT_HOSPITAL: 'district_hospital',
};

// Document Types
const DOC_TYPES = {
  TOKEN_LOGIN: 'token_login',
  TRANSLATIONS: 'translations',
  DATA_RECORD: 'data_record',
};

// HTTP Headers
const HTTP_HEADERS = {
  REQUEST_ID: 'X-Request-Id',
  MEDIC_SERVICE: 'X-Medic-Service',
  MEDIC_USER: 'X-Medic-User',
  OPENROSA_VERSION: 'X-OpenRosa-Version',
  MEDIC_REPLICATION_ID: 'medic-replication-id',
  LOGOUT_AUTHORIZATION: 'logout-authorization',
};

const STANDARD_HTTP_HEADERS = {
  CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
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

// Prefixes
const PREFIXES = {
  COUCH_USER: 'org.couchdb.user:',
  TRANSLATIONS: 'messages-',
};

module.exports = {
  DOC_IDS,
  DOC_TYPES,
  HTTP_HEADERS,
  SENTINEL_METADATA,
  USER_ROLES,
  CONTACT_TYPES,
  STANDARD_HTTP_HEADERS,
  PREFIXES,
};
