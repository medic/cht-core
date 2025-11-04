import logger from '@medic/logger';
import { NouveauHit, NouveauResponse, Nullable, Page } from '../../libs/core';
import { Doc, isDoc } from '../../libs/doc';
import { QueryParams } from './core';
import { getAuthenticatedFetch, getRequestBody } from './request-utils';
import { DEFAULT_IDS_PAGE_LIMIT } from '../../libs/constants';
import { ConflictError } from '../../libs/error';

/** @internal */
export const getDocById = (db: PouchDB.Database<Doc>) => async (uuid: string): Promise<Nullable<Doc>> => db
  .get(uuid)
  .then(doc => isDoc(doc) ? doc : null)
  .catch((err: unknown) => {
    if ((err as PouchDB.Core.Error).status === 404) {
      return null;
    }

    logger.error(`Failed to fetch doc with id [${uuid}]`, err);
    throw err;
  });

/** @internal */
export const getDocsByIds = (db: PouchDB.Database<Doc>) => async (uuids: string[]): Promise<Doc[]> => {
  const keys = Array.from(new Set(uuids.filter(uuid => uuid.length)));
  if (!keys.length) {
    return [];
  }
  const response = await db.allDocs({ keys, include_docs: true });
  return response.rows
    .map(({ doc }) => doc)
    .filter((doc): doc is Doc => isDoc(doc));
};

const queryDocs = (
  db: PouchDB.Database<Doc>,
  view: string,
  options: PouchDB.Query.Options<Doc, Record<string, unknown>>
) => db
  .query(view, options)
  .then(({ rows }) => rows.map(({ doc }) => isDoc(doc) ? doc : null));

/** @internal */
export const queryDocsByRange = (
  db: PouchDB.Database<Doc>,
  view: string
) => async (
  startkey: unknown,
  endkey: unknown,
  limit?: number,
  skip = 0
): Promise<Nullable<Doc>[]> => queryDocs(
  db,
  view,
  {
    include_docs: true,
    startkey,
    endkey,
    limit,
    skip,
  }
);

/** @internal */
export const queryDocsByKey = (
  db: PouchDB.Database<Doc>,
  view: string
) => async (
  key: unknown,
  limit: number,
  skip: number
): Promise<Nullable<Doc>[]> => queryDocs(db, view, { include_docs: true, key, limit, skip, reduce: false });

const queryDocUuids = (
  db: PouchDB.Database<Doc>,
  view: string,
  options: PouchDB.Query.Options<Doc, Record<string, unknown>>
) => db
  .query(view, options)
  .then(({ rows }) => rows.map(({ id }) => id as string));

/** @internal */
export const queryDocUuidsByRange = (
  db: PouchDB.Database<Doc>,
  view: string
) => async (
  startkey: unknown,
  endkey: unknown,
  limit?: number,
  skip = 0
): Promise<string[]> => queryDocUuids(
  db,
  view,
  {
    include_docs: false,
    startkey,
    endkey,
    limit,
    skip,
  }
);

/** @internal */
export const queryDocUuidsByKey = (
  db: PouchDB.Database<Doc>,
  view: string
) => async (
  key: unknown,
  limit: number,
  skip: number
): Promise<string[]> => queryDocUuids(db, view, { include_docs: false, reduce: false, key, limit, skip });

/**
 * Resolves a page containing an array of T using the getFunction to retrieve documents from the database
 * and the filterFunction to validate the returned documents are all type T.
 * The length of the page's data array is guaranteed to equal limit unless there is no more data to retrieve
 * from the database. This function will try to minimize the number of getFunction calls required to find
 * the necessary data by over-fetching during followup calls if some retrieved docs are rejected by the filterFunction.
 * @internal
 */
export const fetchAndFilter = <T>(
  getFunction: (limit: number, skip: number) => Promise<Nullable<T>[]>,
  filterFunction: (doc: Nullable<T>, uuid?: string) => boolean,
  limit: number,
): typeof recursionInner => {
  const recursionInner = async (
    currentLimit: number,
    currentSkip: number,
    currentDocs: T[] = [],
  ): Promise<Page<T>> => {
    const docs = await getFunction(currentLimit, currentSkip);
    const noMoreResults = docs.length < currentLimit;
    const newDocs = docs.filter((doc): doc is T => filterFunction(doc));
    const overFetchCount = currentDocs.length + newDocs.length - limit || 0;
    const totalDocs = [...currentDocs, ...newDocs].slice(0, limit);

    if (noMoreResults) {
      return { data: totalDocs, cursor: null };
    }

    if (totalDocs.length === limit) {
      const nextSkip = currentSkip + currentLimit - overFetchCount;

      return { data: totalDocs, cursor: nextSkip.toString() };
    }

    // Re-fetch twice as many docs as we need to limit number of recursions
    const missingCount = currentLimit - newDocs.length;
    logger.debug(`Found [${missingCount.toString()}] invalid docs. Re-fetching additional records.`);
    const nextLimit = missingCount * 2;
    const nextSkip = currentSkip + currentLimit;

    return recursionInner(
      nextLimit,
      nextSkip,
      totalDocs,
    );
  };
  return recursionInner;
};

/** @internal */
export const fetchAndFilterUuids = (
  getFunction: (limit: number, skip: number) => Promise<string[]>,
  limit: number,
): ReturnType<typeof fetchAndFilter<string>> => {
  const uuidSet = new Set<string>();
  const filterFn = (uuid: Nullable<string>): boolean => {
    if (!uuid) {
      return false;
    }
    const { size } = uuidSet;
    uuidSet.add(uuid);
    return uuidSet.size !== size;
  };

  return fetchAndFilter(
    getFunction,
    filterFn,
    limit
  );
};

/** @internal */
const isPouchDBNotFoundError = (error: unknown): error is { status: 404, name: string } => {
  return (
    typeof error === 'object' && error !== null &&
    'status' in error && (error as { status: number }).status === 404
  );
};

/** @internal */
export const ddocExists = async (db: PouchDB.Database<Doc>, ddocId: string): Promise<boolean> => {
  try {
    await db.get(ddocId);
    return true;
  } catch (err) {
    if (isPouchDBNotFoundError(err)) {
      return false;
    }

    logger.error(`Unexpected error while checking ddoc ${ddocId}:`, err);
    return false;
  }
};

/**
 * Creates a new document in the database. Uses db.post() to auto-generate _id if not provided,
 * or db.put() if _id is provided.
 * @param db the PouchDB database
 * @returns a function that creates a document
 * @internal
 */
export const createDoc = (db: PouchDB.Database<Doc>) => async <T extends Doc>(doc: Omit<T, '_rev'>): Promise<T> => {
  try {
    let response: PouchDB.Core.Response;

    if ('_id' in doc && doc._id) {
      // If _id is provided, use put() - will fail with 409 if ID already exists
      response = await db.put(doc as PouchDB.Core.PutDocument<T>);
    } else {
      // If _id is not provided, use post() which auto-generates _id
      response = await db.post(doc as PouchDB.Core.PostDocument<T>);
    }

    // Fetch and return the created document
    const createdDoc = await db.get(response.id) as T;
    return createdDoc;
  } catch (err) {
    logger.error('Failed to create document:', err);
    throw err;
  }
};

/**
 * Updates an existing document in the database. Requires both _id and _rev.
 * @param db the PouchDB database
 * @returns a function that updates a document
 * @internal
 */
export const updateDoc = (db: PouchDB.Database<Doc>) => async <T extends Doc>(doc: T): Promise<T> => {
  try {
    if (!doc._id) {
      throw new Error('Document _id is required for update.');
    }
    if (!doc._rev) {
      throw new Error('Document _rev is required for update.');
    }

    const response = await db.put(doc as PouchDB.Core.PutDocument<T>);

    // Fetch and return the updated document
    const updatedDoc = await db.get(response.id) as T;
    return updatedDoc;
  } catch (err) {
    logger.error(`Failed to update document [${doc._id}]:`, err);

    // Check if this is a conflict error (revision mismatch or bad rev format)
    const error = err as { status?: number; name?: string; message?: string; error?: string; reason?: string };

    // Check for various conflict indicators from PouchDB/CouchDB
    // Including "Invalid rev format" which indicates a revision conflict
    const isConflict = error.status === 409 ||
                       error.name === 'conflict' ||
                       error.error === 'conflict' ||
                       error.error === 'bad_request' ||  // PouchDB uses this for bad rev
                       (error.reason && /conflict|revision|invalid.*rev/i.test(error.reason)) ||
                       (error.message && /conflict|revision|invalid.*rev/i.test(error.message));

    if (isConflict) {
      throw new ConflictError(error.message || error.reason || 'Document update conflict');
    }

    throw err;
  }
};

/**
 * Similar to {@link fetchAndFilter} but by requesting nouveau endpoint
 * @internal
 */
export const queryNouveauIndex = (
  db: PouchDB.Database<Doc>,
  viewName: string,
): typeof recursionInner => {
  const fetch = getAuthenticatedFetch(db, viewName);
  const recursionInner = async (
    params: QueryParams,
    currentResults: NouveauHit[] = [],
    bookmark: Nullable<string> = null
  ): Promise<Page<NouveauHit>> => {
    const response = await fetch({
      method: 'POST',
      body: getRequestBody(viewName, params, bookmark)
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const responseData = await response.json() as NouveauResponse;
    const newResults = responseData.hits;

    const results = [...currentResults, ...newResults];
    // Keep querying until we have all the results
    if (newResults.length === DEFAULT_IDS_PAGE_LIMIT) {
      return recursionInner(params, results, responseData.bookmark);
    }
    return {
      data: results,
      cursor: responseData.bookmark
    };
  };
  return recursionInner;
};

/** @internal */
export const queryNouveauIndexUuids = (
  db: PouchDB.Database<Doc>,
  viewName: string,
) => {
  return async (params: QueryParams): Promise<Page<string>> => {
    const res = await queryNouveauIndex(db, viewName)(params);
    const resWithIds = res.data.map(doc => doc.id);

    return {
      data: resWithIds,
      cursor: res.cursor
    };
  };
};
