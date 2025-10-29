/** @internal */
export const SORT_BY_VIEW: Record<string, string> = {
  'medic/contacts_by_freetext': 'sort_order',
  'medic/contacts_by_type_freetext': 'sort_order',
  'medic/reports_by_freetext': 'reported_date',
};

/** @internal */
export const isContactsByTypeFreetext = (view: string): boolean => view === 'contacts_by_type_freetext';
