import { hasField, hasFields, isRecord } from './core';

const isDoc = (value: unknown): value is Doc => isRecord(value) && hasFields(value, [
  { name: '_id', type: 'string' },
  { name: '_rev', type: 'string' }
]);

export const getDocsByIds = (db: PouchDB.Database<Doc>) => async (ids: NonEmptyArray<string>): Promise<Doc[]> => {
  const results = await db.allDocs({ keys: ids, include_docs: true });
  return results.rows
    .map(row => row.doc)
    .filter(isDoc);
};

export const getDocById = (db: PouchDB.Database<Doc>) => async (uuid: string): Promise<Nullable<Doc>> => {
  return (await getDocsByIds(db)([uuid]))[0];
};

export const v1 = {
  byUuid: (uuid: string): V1.UuidIdentifier => ({ uuid }),
  isUuidIdentifier: (identifier: unknown): identifier is V1.UuidIdentifier => {
    return isRecord(identifier) && hasField(identifier, { name: 'uuid', type: 'string' });
  }
};
