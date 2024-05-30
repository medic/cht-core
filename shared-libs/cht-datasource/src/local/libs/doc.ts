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
  if (keys.length === 0) {
    return [];
  }
  const response = await db.allDocs({ keys, include_docs: true });
  return response.rows
    .filter(row => isDoc(row.doc))
    .map(row => row.doc as Doc);
};

/**
 * Returns the identified document along with the parent documents recorded for its lineage. The returned array is
 * sorted such that the identified document is the first element and the parent documents are in order of lineage.
 * @internal
 */
export const getLineageDocsById = (medicDb: PouchDB.Database<Doc>) => (
  uuid: string
): Promise<Nullable<Doc>[]> => medicDb
  .query('medic-client/docs_by_id_lineage', {
    startkey: [uuid],
    endkey: [uuid, {}],
    include_docs: true
  })
  .then(({ rows }) => rows
    .map(({ doc }) => doc ?? null)
    .filter((doc): doc is Nullable<Doc> => doc === null || isDoc(doc)));
