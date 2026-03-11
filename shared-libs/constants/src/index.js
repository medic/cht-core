// Shared constants for CHT-Core
// This library provides a single source of truth for magic strings and constants used throughout the application

// Document IDs
const DOC_IDS = {
  SERVICE_WORKER_META: 'service-worker-meta',
  SETTINGS: 'settings',
  RESOURCES: 'resources',
  PARTNERS: 'partners',
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
  '_design/shared-reports',
  '_design/webapp-contacts',
  '_design/webapp-reports',
];

// CouchDB view paths (ddoc/view)
const VIEWS = {
  // medic-admin ddoc
  CONTACTS_BY_DHIS_ORGUNIT: 'medic-admin/contacts_by_dhis_orgunit',
  MESSAGE_QUEUE: 'medic-admin/message_queue',

  // medic-conflicts ddoc
  CONFLICTS: 'medic-conflicts/conflicts',

  // medic-offline-freetext ddoc (offline client freetext search)
  CONTACTS_BY_FREETEXT: 'medic-offline-freetext/contacts_by_freetext',
  CONTACTS_BY_TYPE_FREETEXT: 'medic-offline-freetext/contacts_by_type_freetext',
  REPORTS_BY_FREETEXT: 'medic-offline-freetext/reports_by_freetext',

  // medic-sms ddoc
  GATEWAY_MESSAGES_BY_STATE: 'medic-sms/gateway_messages_by_state',
  MESSAGES_BY_GATEWAY_REF: 'medic-sms/messages_by_gateway_ref',
  MESSAGES_BY_LAST_UPDATED_STATE: 'medic-sms/messages_by_last_updated_state',
  MESSAGES_BY_STATE: 'medic-sms/messages_by_state',
  MESSAGES_BY_UUID: 'medic-sms/messages_by_uuid',

  // replication ddoc
  CONTACTS_BY_DEPTH: 'replication/contacts_by_depth',
  CONTACTS_BY_PRIMARY_CONTACT: 'replication/contacts_by_primary_contact',
  DOCS_BY_REPLICATION_KEY: 'replication/docs_by_replication_key',

  // sentinel ddoc (sentinel db)
  OUTBOUND_PUSH_TASKS: 'sentinel/outbound_push_tasks',

  // server ddoc (server-only views, not replicated)
  DOC_SUMMARIES_BY_ID: 'server/doc_summaries_by_id',
  DOCS_BY_SHORTCODE: 'server/docs_by_shortcode',
  REPORTS_BY_FORM_AND_PARENT: 'server/reports_by_form_and_parent',
  REPORTS_BY_FORM_YEAR_MONTH_PARENT_REPORTED_DATE: 'server/reports_by_form_year_month_parent_reported_date',
  REPORTS_BY_FORM_YEAR_WEEK_PARENT_REPORTED_DATE: 'server/reports_by_form_year_week_parent_reported_date',
  TASKS_IN_TERMINAL_STATE: 'server/tasks_in_terminal_state',

  // shared ddoc
  CONTACTS_BY_PHONE: 'shared/contacts_by_phone',
  CONTACTS_BY_REFERENCE: 'shared/contacts_by_reference',
  CONTACTS_BY_TYPE: 'shared/contacts_by_type',
  DOC_BY_TYPE: 'shared/doc_by_type',
  DOCS_BY_ID_LINEAGE: 'shared/docs_by_id_lineage',
  REGISTERED_PATIENTS: 'shared/registered_patients',

  // shared-reports ddoc
  REPORTS_BY_DATE: 'shared-reports/reports_by_date',
  REPORTS_BY_FORM: 'shared-reports/reports_by_form',
  REPORTS_BY_SUBJECT: 'shared-reports/reports_by_subject',
  TASKS_BY_CONTACT: 'shared-reports/tasks_by_contact',

  // webapp-contacts ddoc
  CONTACTS_BY_LAST_VISITED: 'webapp-contacts/contacts_by_last_visited',
  CONTACTS_BY_PARENT: 'webapp-contacts/contacts_by_parent',
  CONTACTS_BY_PLACE: 'webapp-contacts/contacts_by_place',
  MESSAGES_BY_CONTACT_DATE: 'webapp-contacts/messages_by_contact_date',

  // webapp-reports ddoc
  DATA_RECORDS_BY_TYPE: 'webapp-reports/data_records_by_type',
  REPORTS_BY_PLACE: 'webapp-reports/reports_by_place',
  REPORTS_BY_VALIDITY: 'webapp-reports/reports_by_validity',
  REPORTS_BY_VERIFICATION: 'webapp-reports/reports_by_verification',
  VISITS_BY_DATE: 'webapp-reports/visits_by_date',

  // users-meta ddoc (users-meta db)
  DEVICE_BY_USER: 'users-meta/device_by_user',
  FEEDBACK_BY_DATE: 'users-meta/feedback_by_date',

  // users ddoc (_users db)
  USERS_BY_FIELD: 'users/users_by_field',

  // medic-user ddoc (local meta db)
  READ: 'medic-user/read',

  // logs ddoc (logs db)
  CONNECTED_USERS: 'logs/connected_users',
  REPLICATION_LIMIT: 'logs/replication_limit',
};

// User Roles
const USER_ROLES = {
  ONLINE: 'mm-online',
};

// CouchDB Nouveau index paths (ddoc/index)
const NOUVEAU_INDEXES = {
  // server ddoc
  CONTACTS_BY_FREETEXT: 'server/contacts_by_freetext',
  REPORTS_BY_FREETEXT: 'server/reports_by_freetext',

  // replication ddoc
  DOCS_BY_REPLICATION_KEY: 'replication/docs_by_replication_key',
};

// Converts a view path like 'shared/doc_by_type' to the CouchDB URL segment '_design/shared/_view/doc_by_type'
const viewUrl = (viewPath) => `_design/${viewPath.replace('/', '/_view/')}`;

// Converts a nouveau index path like 'replication/docs_by_replication_key'
// to '_design/replication/_nouveau/docs_by_replication_key'
const nouveauUrl = (indexPath) => `_design/${indexPath.replace('/', '/_nouveau/')}`;

// Converts a nouveau index path to its info URL segment: '_design/replication/_nouveau_info/docs_by_replication_key'
const nouveauInfoUrl = (indexPath) => `_design/${indexPath.replace('/', '/_nouveau_info/')}`;

module.exports = {
  DOC_IDS,
  DOC_TYPES,
  HTTP_HEADERS,
  NOUVEAU_INDEXES,
  REPLICATED_DDOCS,
  SENTINEL_METADATA,
  USER_ROLES,
  CONTACT_TYPES,
  VIEWS,
  nouveauInfoUrl,
  nouveauUrl,
  viewUrl,
};
