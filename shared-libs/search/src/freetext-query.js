const DEFAULT_IDS_PAGE_LIMIT = 10000;

const ddocExists = async (db, ddocId) => {
  const { rows } = await db.allDocs({ keys: [ddocId] });
  return rows?.length && rows[0]?.error !== 'not_found';
};

let promisedIsOffline = null;
const isOffline = async (db) => {
  if (promisedIsOffline === null) {
    promisedIsOffline = ddocExists(db, '_design/medic-offline-freetext');
  }
  return promisedIsOffline;
};

const SORT_BY_VIEW = {
  'medic/contacts_by_freetext': 'sort_order',
  'medic/reports_by_freetext': 'reported_date',
};

const isContactsByTypeFreetext = view => view === 'contacts_by_type_freetext';

const getNouveauPath = view => {
  const indexName = isContactsByTypeFreetext(view) ? 'contacts_by_freetext' : view;
  return `_design/medic/_nouveau/${indexName}`;
};

const NOUVEAU_SPECIAL_CHARS_REGEX = /[+\-&|!(){}[\]^"~*?:\\/]/g;
const getEscapedKey = key => key.replace(NOUVEAU_SPECIAL_CHARS_REGEX, '\\$&');

const getQuery = (key, startkey) => {
  if (key) {
    return `exact_match:"${key}"`;
  }
  // Fuzzy match
  return `${getEscapedKey(startkey)}*`;
};

const getLuceneQueryString = (view, { key, startkey }) => {
  if (isContactsByTypeFreetext(view)) {
    return `contact_type:"${(key || startkey)[0]}" AND ${getQuery(key?.[1], startkey?.[1])}`;
  }

  return getQuery(key?.[0], startkey?.[0]);
};

const getRequestBody = (view, params, bookmark) => {
  return JSON.stringify({
    bookmark,
    limit: DEFAULT_IDS_PAGE_LIMIT,
    sort: SORT_BY_VIEW[view],
    q: getLuceneQueryString(view, params),
  });
};

/**
 * @param fetch {function}
 * @param reqData {{
 *   view: string,
 *   params: {
 *     key: string?,
 *     startkey: string?,
 *   }
 * }}
 * @param currentResults used for recursion
 * @param bookmark used for recursion
 * @returns {Promise<{
 *   id: string,
 *   key: string,
 *   value: string
 * }[]>}
 */
const queryNouveauIndex = async (fetch, { view, params }, currentResults = [], bookmark = null) => {
  const response = await fetch({
    method: 'POST',
    body: getRequestBody(view, params, bookmark)
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const newResults = (await response.json()).hits.map(hit => {
    return {
      id: hit.id,
      key: params.key || params.startkey,
      value: hit.fields.sort_order,
    };
  });

  const results = [...currentResults, ...newResults];
  // Keep querying until we have all the results
  if (newResults.length === DEFAULT_IDS_PAGE_LIMIT) {
    return queryNouveauIndex({ view, params }, results, response.bookmark);
  }
  return results;
};

const getAuthenticatedFetch = (dataContext, view) => {
  const nouveauPath = getNouveauPath(view);
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (dataContext.medicDb) {
    // Using local data context, but online. Let Pouch handle auth.
    // Currently, PouchDB does not support Nouveau queries, so we have to use the fetch
    return (options) => dataContext.medicDb.fetch(nouveauPath, { headers, ...options });
  }

  const url = dataContext.url || '';
  return (options) => {
    return global.fetch(`${url}/medic/${nouveauPath}`, { headers, ...options });
  };
};

const queryView = async (db, request) => db
  .query(request.view, request.params)
  .then(data => {
    if (request.map) {
      return data.rows.map(request.map);
    }
    return data.rows;
  });

const getOfflineViewId = view => `medic-offline-freetext/${view}`;

const queryFreetext = async (dataContext, db, request) => {
  if (await isOffline(db)) {
    return queryView(db, { ...request, view: getOfflineViewId(request.view) });
  }

  const fetch = getAuthenticatedFetch(dataContext, request.view);
  return queryNouveauIndex(fetch, request);
};

module.exports = {
  queryFreetext
};
