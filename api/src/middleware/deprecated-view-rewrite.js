const logger = require('@medic/logger');

// Maps view names from their old design documents (medic / medic-client)
// to the new design documents introduced by the view reorganization (#2849).
// External projects (cht-conf, support-scripts, cht-user-management) may still
// reference the old URLs, so we transparently rewrite them.
const VIEW_MAPPING = {
  medic: {
    contacts_by_depth: 'replication',
    contacts_by_primary_contact: 'replication',
    doc_summaries_by_id: 'online-user',
    docs_by_shortcode: 'shared',
    messages_by_state: 'medic-sms',
    reports_by_form_and_parent: 'report-transitions',
    reports_by_form_year_month_parent_reported_date: 'report-transitions',
    reports_by_form_year_week_parent_reported_date: 'report-transitions',
    tasks_in_terminal_state: 'sentinel-schedule',
  },
  'medic-client': {
    contacts_by_last_visited: 'webapp-contacts',
    contacts_by_parent: 'webapp-contacts',
    contacts_by_phone: 'shared-contacts',
    contacts_by_place: 'webapp-contacts',
    contacts_by_reference: 'shared-contacts',
    contacts_by_type: 'shared-contacts',
    data_records_by_type: 'webapp-reports',
    doc_by_type: 'shared',
    docs_by_id_lineage: 'shared',
    messages_by_contact_date: 'webapp-reports',
    registered_patients: 'shared-contacts',
    reports_by_date: 'shared-reports',
    reports_by_form: 'shared-reports',
    reports_by_place: 'webapp-reports',
    reports_by_subject: 'shared-reports',
    reports_by_validity: 'webapp-reports',
    reports_by_verification: 'webapp-reports',
    tasks_by_contact: 'shared-reports',
    visits_by_date: 'webapp-reports',
  },
};

// Matches: /{db}/_design/{ddoc}/_view/{view}
// Captures: ddoc name and view name
const VIEW_URL_PATTERN = /^(\/[^/]+\/_design\/)(medic-client|medic)(\/_view\/)([a-z_]+)(.*)/;

const rewriteDeprecatedViewUrl = (req, res, next) => {
  const match = req.url.match(VIEW_URL_PATTERN);
  if (!match) {
    return next();
  }

  const [, prefix, oldDdoc, viewSegment, viewName, rest] = match;
  const ddocMapping = VIEW_MAPPING[oldDdoc];
  const newDdoc = ddocMapping && ddocMapping[viewName];

  if (!newDdoc) {
    return next();
  }

  const oldUrl = req.url;
  req.url = `${prefix}${newDdoc}${viewSegment}${viewName}${rest}`;
  logger.warn(`Rewriting deprecated view URL: ${oldUrl} -> ${req.url}`);
  next();
};

module.exports = {
  rewriteDeprecatedViewUrl,
  VIEW_MAPPING,
};
