import { Doc } from '../../libs/doc';
import { Nullable, Page } from '../../libs/core';
import {
  ContactTypeQualifier,
  FreetextQualifier,
  isContactTypeQualifier,
  isKeyedFreetextQualifier
} from '../../qualifier';
import { escapeKeys } from '@medic/nouveau';
import { getDocById } from './doc';

const MEDIC_NOUVEAU_PATH = '_design/online-user/_nouveau';
const jsonContentTypeHeaders = new Headers({ 'Content-Type': 'application/json' });
const SORT_BY_VIEW: Record<string, string> = {
  'contacts_by_freetext': 'sort_order',
  'reports_by_freetext': 'reported_date',
};

/**
 * Uses the internal PouchDB `fetch` function to make an authenticated request against the Couch server. This is needed
 * because PouchDB currently does not support Nouveau endpoints.
 * @param db the (remote) database
 * @param url the endpoint to fetch
 * @param opts the request options
 */
const fetchWithDb = (
  db: PouchDB.Database<Doc>,
  url: string,
  opts: RequestInit
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
) => db.fetch(url, opts);

const getQueryByFreetext = (qualifier: FreetextQualifier) => {
  if (isKeyedFreetextQualifier(qualifier)) {
    return `exact_match:"${qualifier.freetext}"`;
  }
  // Fuzzy match
  return `${escapeKeys(qualifier.freetext)}*`;
};

const getQueryByTypeFreetext = (qualifier: FreetextQualifier & Partial<ContactTypeQualifier>) => {
  const freetextQuery = getQueryByFreetext(qualifier);
  if (!isContactTypeQualifier(qualifier)) {
    return freetextQuery;
  }
  return `contact_type:"${qualifier.contactType}" AND ${freetextQuery}`;
};

/** @internal */
export const queryByFreetext = (
  db: PouchDB.Database<Doc>,
  index: string
) => async (
  qualifier: FreetextQualifier & Partial<ContactTypeQualifier>,
  cursor: Nullable<string>,
  limit: number
): Promise<Page<string>> => {
  const opts = {
    headers: jsonContentTypeHeaders,
    method: 'POST',
    body: JSON.stringify({
      bookmark: cursor,
      limit,
      q: getQueryByTypeFreetext(qualifier),
      sort: SORT_BY_VIEW[index],
    })
  };
  const response = await fetchWithDb(db, `${MEDIC_NOUVEAU_PATH}/${index}`, opts);
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const nouveauResp = await response.json();
  const data: string[] = nouveauResp?.hits?.map((hit: { id: string }) => hit.id) ?? [];
  const nextCursor: string | null = data.length < limit || nouveauResp?.bookmark === cursor
    ? null :
    nouveauResp?.bookmark;
  return { data, cursor: nextCursor };
};

/** @internal */
export const useNouveauIndexes = async (medicDb: PouchDB.Database<Doc>): Promise<boolean> => {
  const ddoc = await getDocById(medicDb)('_design/medic-offline-freetext');
  return ddoc === null;
};
