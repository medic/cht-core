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

/** @internal */
export const queryDocsByKey = (
  db: PouchDB.Database<Doc>,
  view: string
) => async (key: string): Promise<Nullable<Doc>[]> => db
  .query(view, {
    startkey: [key],
    endkey: [key, {}],
    include_docs: true
  })
  .then(({ rows }) => rows.map(({ doc }) => isDoc(doc) ? doc : null));

