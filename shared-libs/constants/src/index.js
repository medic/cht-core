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

// Metadata Keys
const METADATA_KEYS = {
  TRANSITIONS_SEQ: '_local/transitions-seq',
  BACKGROUND_SEQ: '_local/background-seq',
};

module.exports = {
  USER_ROLES,
  DOC_IDS,
  METADATA_KEYS,
};
