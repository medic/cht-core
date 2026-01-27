// Mapping of view names to their design documents
// Used by both the API view controller and the ddoc build script
module.exports = {
  // auth
  contacts_by_depth: 'auth',
  contacts_by_primary_contact: 'auth',

  // client-contacts
  contacts_by_last_visited: 'client-contacts',
  contacts_by_parent: 'client-contacts',
  contacts_by_place: 'client-contacts',

  // client-reports
  data_records_by_type: 'client-reports',
  messages_by_contact_date: 'client-reports',
  reports_by_place: 'client-reports',
  reports_by_validity: 'client-reports',
  reports_by_verification: 'client-reports',
  visits_by_date: 'client-reports',

  // doc-summaries
  doc_summaries_by_id: 'doc-summaries',

  // medic-admin
  contacts_by_dhis_orgunit: 'medic-admin',
  message_queue: 'medic-admin',

  // medic-conflicts
  conflicts: 'medic-conflicts',

  // medic-sms
  gateway_messages_by_state: 'medic-sms',
  messages_by_gateway_ref: 'medic-sms',
  messages_by_last_updated_state: 'medic-sms',
  messages_by_state: 'medic-sms',
  messages_by_uuid: 'medic-sms',

  // purging
  tasks_in_terminal_state: 'purging',

  // report-transitions
  reports_by_form_and_parent: 'report-transitions',
  reports_by_form_year_month_parent_reported_date: 'report-transitions',
  reports_by_form_year_week_parent_reported_date: 'report-transitions',

  // shared-contacts
  contacts_by_phone: 'shared-contacts',
  contacts_by_reference: 'shared-contacts',
  contacts_by_type: 'shared-contacts',
  registered_patients: 'shared-contacts',

  // shared-docs
  doc_by_type: 'shared-docs',
  docs_by_id_lineage: 'shared-docs',
  docs_by_shortcode: 'shared-docs',

  // shared-reports
  reports_by_date: 'shared-reports',
  reports_by_form: 'shared-reports',
  reports_by_subject: 'shared-reports',
  tasks_by_contact: 'shared-reports',
};
