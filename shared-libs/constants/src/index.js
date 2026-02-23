// Shared constants for CHT-Core
// This library provides a single source of truth for magic strings and constants used throughout the application

// Document IDs
const DOC_IDS = {
  SERVICE_WORKER_META: 'service-worker-meta',
  SETTINGS: 'settings',
  RESOURCES: 'resources',
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
};

// Design documents replicated to offline clients
const REPLICATED_DDOCS = [
  '_design/medic-client',
  '_design/shared',
  '_design/shared-contacts',
  '_design/shared-reports',
  '_design/webapp-contacts',
  '_design/webapp-reports',
];

// User Roles
const USER_ROLES = {
  ONLINE: 'mm-online',
};

module.exports = {
  DOC_IDS,
  DOC_TYPES,
  HTTP_HEADERS,
  REPLICATED_DDOCS,
  SENTINEL_METADATA,
  USER_ROLES,
  CONTACT_TYPES,
};
