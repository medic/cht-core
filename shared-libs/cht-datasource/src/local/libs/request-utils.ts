import { isContactsByTypeFreetext, SORT_BY_VIEW } from './constants';
import { QueryParams } from './core';
import { Nullable } from '../../libs/core';
import PouchDB from 'pouchdb-core';
import PouchDBAdapterHttp from 'pouchdb-adapter-http';
import PouchDBSessionAuth from 'pouchdb-session-authentication';

PouchDB.plugin(PouchDBAdapterHttp);
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
PouchDB.plugin(PouchDBSessionAuth);

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
    return PouchDB.fetch(`http://localhost:5988/medic/${nouveauPath}`, { headers, ...options });
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
