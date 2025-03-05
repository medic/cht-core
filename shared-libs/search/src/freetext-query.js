// TODO Cannot use either of these in webapp....
const environment = require('@medic/environment');

const DEFAULT_IDS_PAGE_LIMIT = 10000;

let promisedIsOffline = null;

const ddocExists = (db, ddocId) => db
  .get(ddocId)
  .then(() => true)
  .catch(() => false);
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

const getNouveauUrl = view => {
  const indexName = isContactsByTypeFreetext(view) ? 'contacts_by_freetext' : view;
  return `${environment.couchUrl}/_design/medic/_nouveau/${indexName}`;
};

const getQuery = (key, startkey) => {
  if (key) {
    return `exact_match:"${key}"`;
  }
  // Fuzzy match
  return `"${startkey}"`;
};

const getLuceneQueryString = (view, { key, startkey }) => {
  if (isContactsByTypeFreetext(view)) {
    return `contact_type:"${(key || startkey)[0]}" AND ${getQuery(key?.[1], startkey?.[1])}`;
  }

  return getQuery(key, startkey);
};

const getRequestOptions = (view, params, bookmark) => {
  return {
    url: getNouveauUrl(view),
    json: true,
    body: {
      bookmark,
      limit: DEFAULT_IDS_PAGE_LIMIT,
      sort: SORT_BY_VIEW[view],
      q: getLuceneQueryString(view, params),
    }
  };
};

/**
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
const queryNouveauIndex = async ({ view, params }, currentResults = [], bookmark = null) => {
  const reqOptions = getRequestOptions(view, params, bookmark);
  // TODO switch this to fetch. Have to sort out
  // TODO Need to perhaps take in the datacontext - if remote, use given url. If local, extract the url from pouchInstance.

  // db.name

  const response = await request.post(reqOptions);

  const newResults = response.hits.map(hit => {
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
  return queryNouveauIndex(request);
};

module.exports = {
  queryFreetext
};
