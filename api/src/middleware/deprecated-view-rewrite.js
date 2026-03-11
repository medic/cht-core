const logger = require('@medic/logger');
const { VIEWS } = require('@medic/constants');

const getDdoc = (viewPath) => viewPath.split('/')[0];

// Maps view names from their old design documents (medic / medic-client)
// to the new design documents introduced by the view reorganization (#2849).
// External projects (cht-conf, support-scripts, cht-user-management) may still
// reference the old URLs, so we transparently rewrite them.
const VIEW_MAPPING = {
  medic: {
    contacts_by_depth: getDdoc(VIEWS.CONTACTS_BY_DEPTH),
    contacts_by_primary_contact: getDdoc(VIEWS.CONTACTS_BY_PRIMARY_CONTACT),
    doc_summaries_by_id: getDdoc(VIEWS.DOC_SUMMARIES_BY_ID),
    docs_by_shortcode: getDdoc(VIEWS.DOCS_BY_SHORTCODE),
    messages_by_state: getDdoc(VIEWS.MESSAGES_BY_STATE),
    reports_by_form_and_parent: getDdoc(VIEWS.REPORTS_BY_FORM_AND_PARENT),
    reports_by_form_year_month_parent_reported_date: getDdoc(VIEWS.REPORTS_BY_FORM_YEAR_MONTH_PARENT_REPORTED_DATE),
    reports_by_form_year_week_parent_reported_date: getDdoc(VIEWS.REPORTS_BY_FORM_YEAR_WEEK_PARENT_REPORTED_DATE),
    tasks_in_terminal_state: getDdoc(VIEWS.TASKS_IN_TERMINAL_STATE),
  },
  'medic-client': {
    contacts_by_last_visited: getDdoc(VIEWS.CONTACTS_BY_LAST_VISITED),
    contacts_by_parent: getDdoc(VIEWS.CONTACTS_BY_PARENT),
    contacts_by_phone: getDdoc(VIEWS.CONTACTS_BY_PHONE),
    contacts_by_place: getDdoc(VIEWS.CONTACTS_BY_PLACE),
    contacts_by_reference: getDdoc(VIEWS.CONTACTS_BY_REFERENCE),
    contacts_by_type: getDdoc(VIEWS.CONTACTS_BY_TYPE),
    data_records_by_type: getDdoc(VIEWS.DATA_RECORDS_BY_TYPE),
    doc_by_type: getDdoc(VIEWS.DOC_BY_TYPE),
    docs_by_id_lineage: getDdoc(VIEWS.DOCS_BY_ID_LINEAGE),
    messages_by_contact_date: getDdoc(VIEWS.MESSAGES_BY_CONTACT_DATE),
    registered_patients: getDdoc(VIEWS.REGISTERED_PATIENTS),
    reports_by_date: getDdoc(VIEWS.REPORTS_BY_DATE),
    reports_by_form: getDdoc(VIEWS.REPORTS_BY_FORM),
    reports_by_place: getDdoc(VIEWS.REPORTS_BY_PLACE),
    reports_by_subject: getDdoc(VIEWS.REPORTS_BY_SUBJECT),
    reports_by_validity: getDdoc(VIEWS.REPORTS_BY_VALIDITY),
    reports_by_verification: getDdoc(VIEWS.REPORTS_BY_VERIFICATION),
    tasks_by_contact: getDdoc(VIEWS.TASKS_BY_CONTACT),
    visits_by_date: getDdoc(VIEWS.VISITS_BY_DATE),
  },
};

// Matches: /{db}/_design/{ddoc}/_view/{view}
// Captures: ddoc name and view name
const DEPRECATED_DDOCS = Object.keys(VIEW_MAPPING).join('|');
const VIEW_URL_PATTERN = new RegExp(`^(\\/[^/]+\\/_design\\/)(${DEPRECATED_DDOCS})(\\/_view\\/)([a-z_]+)(.*)`);

const rewriteDeprecatedViewUrl = (req, res, next) => {
  const match = req.url.match(VIEW_URL_PATTERN);
  if (!match) {
    return next();
  }

  const [, prefix, oldDdoc, viewSegment, viewName, rest] = match;
  const newDdoc = VIEW_MAPPING[oldDdoc] && VIEW_MAPPING[oldDdoc][viewName];

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
