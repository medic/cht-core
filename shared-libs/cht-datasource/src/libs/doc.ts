import { hasField, hasFields, isRecord, NonEmptyArray, Nullable } from './core';

const isDoc = (value: unknown): value is Doc => isRecord(value) && hasFields(value, [
  { name: '_id', type: 'string' },
  { name: '_rev', type: 'string' }
]);

export type DataPrimitive = string | number | boolean | Date | null | undefined;

export interface Doc extends Readonly<Record<string, DataPrimitive | DocArray | Doc>> {
  _id: string;
  _rev: string;
}

export interface DocArray extends Readonly<(DataPrimitive | DocArray | Doc)[]> { }

export const getDocsByIds = (db: PouchDB.Database<Doc>) => async (ids: NonEmptyArray<string>): Promise<Doc[]> => {
  const results = await db.allDocs({ keys: ids, include_docs: true });
  return results.rows
    .map(row => row.doc)
    .filter(isDoc);
};

export const getDocById = (db: PouchDB.Database<Doc>) => async (uuid: string): Promise<Nullable<Doc>> => {
  return (await getDocsByIds(db)([uuid]))[0];
};

export namespace V1 {
  export type UuidIdentifier = Readonly<{ uuid: string }>;
  export const byUuid = (uuid: string): UuidIdentifier => ({ uuid });

  export const isUuidIdentifier = (identifier: unknown): identifier is UuidIdentifier => {
    return isRecord(identifier) && hasField(identifier, { name: 'uuid', type: 'string' });
  };
}
