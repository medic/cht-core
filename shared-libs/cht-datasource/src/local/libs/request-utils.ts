import { isContactsByTypeFreetext, SORT_BY_VIEW } from './constants';
import { QueryParams } from './core';
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
    return fetch(`${url}/medic/${nouveauPath}`, { headers, ...options });
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

  return getQuery(key ? key[0] : null, startKey ? startKey[0] : null);
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
