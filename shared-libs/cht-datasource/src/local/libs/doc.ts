import logger from '@medic/logger';
import { Nullable } from '../../libs/core';
import { Doc, isDoc } from '../../libs/doc';

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

const queryDocs = (db: PouchDB.Database<Doc>, view: string, options: PouchDB.Query.Options<Doc, unknown>) => db
  .query(view, {...options})
  .then(({ rows }) => rows.map(({ doc }) => isDoc(doc) ? doc : null));

/** @internal */
export const queryDocsByRange = (
  db: PouchDB.Database<Doc>,
  view: string
) => async (
  startkey: unknown,
  endkey: unknown
): Promise<Nullable<Doc>[]> => queryDocs(db, view, { include_docs: true, startkey, endkey});

/** @internal */
export const queryDocsByKey = (
  db: PouchDB.Database<Doc>,
  view: string
) => async (
  key: unknown,
  limit: number,
  skip: number
): Promise<Nullable<Doc>[]> => queryDocs(db, view, { include_docs: true, key, limit, skip });
