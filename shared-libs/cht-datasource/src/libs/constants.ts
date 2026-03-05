/** @ignore */
export const DEFAULT_DOCS_PAGE_LIMIT = 100;

/** @ignore */
export const DEFAULT_IDS_PAGE_LIMIT = 10000;

/** @ignore */
export const END_OF_ALPHABET_MARKER = '\ufff0';

/** @ignore */
export const VIEWS = {
  CONTACTS_BY_FREETEXT: 'medic-offline-freetext/contacts_by_freetext',
  CONTACTS_BY_TYPE_FREETEXT: 'medic-offline-freetext/contacts_by_type_freetext',
  REPORTS_BY_FREETEXT: 'medic-offline-freetext/reports_by_freetext',
  CONTACTS_BY_TYPE: 'shared/contacts_by_type',
  CONTACTS_BY_PHONE: 'shared/contacts_by_phone',
  CONTACTS_BY_REFERENCE: 'shared/contacts_by_reference',
  REGISTERED_PATIENTS: 'shared/registered_patients',
  DOC_BY_TYPE: 'shared/doc_by_type',
  DOCS_BY_ID_LINEAGE: 'shared/docs_by_id_lineage',
  DOCS_BY_SHORTCODE: 'server/docs_by_shortcode',
  REPORTS_BY_DATE: 'shared-reports/reports_by_date',
  REPORTS_BY_FORM: 'shared-reports/reports_by_form',
  REPORTS_BY_SUBJECT: 'shared-reports/reports_by_subject',
  TASKS_BY_CONTACT: 'shared-reports/tasks_by_contact',
  DOC_SUMMARIES_BY_ID: 'server/doc_summaries_by_id',
} as const;

/** @ignore */
export const NOUVEAU_INDEXES = {
  CONTACTS_BY_FREETEXT: 'online-user/contacts_by_freetext',
  REPORTS_BY_FREETEXT: 'online-user/reports_by_freetext',
} as const;

/** @ignore */
export const nouveauUrl = (indexPath: string): string => `_design/${indexPath.replace('/', '/_nouveau/')}`;
