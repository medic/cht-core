// Shared constants for CHT-Core
// This library provides a single source of truth for magic strings and constants used throughout the application

// User Roles
const USER_ROLES = {
  ONLINE: 'mm-online',
};

// Document IDs
const DOC_IDS = {
  SERVICE_WORKER_META: 'service-worker-meta',
};

// Sentinel Metadata
const SENTINEL_METADATA = {
  TRANSITIONS_SEQ: '_local/transitions-seq',
  BACKGROUND_SEQ: '_local/background-seq',
};

// HTTP Headers
const HTTP_HEADERS = {
  REQUEST_ID: 'X-Request-Id',
};

// Document Types
const DOC_TYPES = {
  TRANSLATIONS: 'translations',
};

module.exports = {
  USER_ROLES,
  DOC_IDS,
  SENTINEL_METADATA,
  HTTP_HEADERS,
  DOC_TYPES,
};
