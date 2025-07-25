import { isContactsByTypeFreetext, SORT_BY_VIEW } from './constants';
import { QueryKey, QueryParams } from './core';
import { Nullable } from '../../libs/core';
import { Doc } from '../../libs/doc';

const getNouveauPath = (view: string): string => {
  const indexName = isContactsByTypeFreetext(view) ? 'contacts_by_freetext' : view;
  return `_design/medic/_nouveau/${indexName}`;
};

/** @internal */
export const getAuthenticatedFetch = (db: PouchDB.Database<Doc>, view: string) => {
  const nouveauPath = getNouveauPath(view);
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  return (options: RequestInit | undefined): Promise<Response> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return db.fetch(nouveauPath, { headers, ...options });
  };
};

/** @internal */
export const getRequestBody = (
  view: string,
  params: QueryParams,
  bookmark: Nullable<string>
): string => {
  return JSON.stringify({
    bookmark: bookmark ?? params.cursor,
    limit: params.limit,
    q: getLuceneQueryString(view, params),
    sort: SORT_BY_VIEW[view],
  });
};

const getLuceneQueryString = (
  view: string,
  { key, startKey }: QueryParams
) => {
  if (isContactsByTypeFreetext(view)) {
    if (key) {
      return `contact_type:"${key[0]}" AND ${getQuery(key[1], null)}`;
    }

    if (startKey) {
      return `contact_type:"${startKey[0]}" AND ${getQuery(null, startKey[1])}`;
    }
  }

  return getQuery(getFirstItem(key), getFirstItem(startKey));
};

const NOUVEAU_SPECIAL_CHARS_REGEX = /[+\-&|!(){}[\]^"~*?:\\/]/g;
const getEscapedKey = (key: string) => key.replace(NOUVEAU_SPECIAL_CHARS_REGEX, '\\$&');

const getQuery = (key?: Nullable<string>, startKey?: Nullable<string>): string => {
  if (key) {
    return `exact_match:"${key}"`;
  }

  if (startKey) {
    return `${getEscapedKey(startKey)}*`;
  }

  return '';
};

const getFirstItem = (queryKey?: QueryKey): Nullable<string> => {
  if (!queryKey) {
    return null;
  }
  return Array.isArray(queryKey) ? queryKey[0] : queryKey;
};
