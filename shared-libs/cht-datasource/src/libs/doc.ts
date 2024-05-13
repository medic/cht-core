import { hasFields, isRecord, NonEmptyArray, Nullable } from './core';

type DataPrimitive = string | number | boolean | Date | null | undefined;
interface DocArray extends Readonly<(DataPrimitive | DocArray | Doc)[]> { }

export interface Doc extends Readonly<Record<string, DataPrimitive | DocArray | Doc>> {
  _id: string;
  _rev: string;
}

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
