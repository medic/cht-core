import { isContactsByTypeFreetext, SORT_BY_VIEW } from './constants';
import { QueryByKeyParams, QueryByRangeParams } from './core';
import { DEFAULT_IDS_PAGE_LIMIT } from '../../libs/constants';
import { Nullable } from '../../libs/core';

const getNouveauPath = (view: string): string => {
  const indexName = isContactsByTypeFreetext(view) ? 'contacts_by_freetext' : view;
  return `_design/medic/_nouveau/${indexName}`;
};

/** @internal */
export const getAuthenticatedFetch = (view: string) => {
  const nouveauPath = getNouveauPath(view);
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  return (url: string, options: RequestInit | undefined): Promise<Response> => {
    return global.fetch(`${url}/medic/${nouveauPath}`, { headers, ...options });
  };
};

/** @internal */
export const getRequestBody = (
  view: string,
  params: QueryByKeyParams | QueryByRangeParams,
  bookmark: Nullable<string>
): string => {
  return JSON.stringify({
    bookmark,
    limit: DEFAULT_IDS_PAGE_LIMIT,
    q: getLuceneQueryString(view, params),
    sort: SORT_BY_VIEW[view],
  });
};

const getLuceneQueryString = (
  view: string,
  { key, startKey }: { key?: Nullable<string | string[]>, startKey?: Nullable<string | string[]>}
) => {
  if (isContactsByTypeFreetext(view)) {
    if (key) {
      return `contact_type:"${key[0]}" AND ${getQuery(key[1], null)}`;
    }

    if (startKey) {
      return `contact_type:"${startKey[0]}" AND ${getQuery(null, startKey[1])}`;
    }
  }

  return getQuery(key, startKey);
};

// Helper function to convert parameter to string
const paramToString = (param: string | string[]): string => Array.isArray(param) ? param.join(' ') : param;

const getQuery = (key?: Nullable<string | string[]>, startKey?: Nullable<string | string[]>): string => {
  if (key) {
    return `exact_match:"${paramToString(key)}"`;
  }

  if (startKey) {
    return `"${paramToString(startKey)}"`;
  }

  return '';
};
