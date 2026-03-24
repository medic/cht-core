import type PouchDB from 'pouchdb';
export default function (p: typeof Promise, db: PouchDB.Database): {
  fetchHydratedDoc: (
    uuid: string,
    options?: { throwWhenMissingLineage?: boolean },
    callback?: (err: Error | null, result?: Record<string, unknown>) => void
  ) => Promise<Record<string, unknown>>,
  minify: (doc: Record<string, unknown>) => void,
  minifyLineage: (parent: Record<string, unknown>) => Record<string, unknown>
};
