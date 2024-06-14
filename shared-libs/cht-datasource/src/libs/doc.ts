import { DataObject, hasFields, isRecord } from './core';

/**
 * A document from the database.
 */
export interface Doc extends DataObject {
  readonly _id: string;
  readonly _rev: string;
}

/** @internal */
export const isDoc = (value: unknown): value is Doc => {
  return isRecord(value) && hasFields(value, [
    { name: '_id', type: 'string' },
    { name: '_rev', type: 'string' }
  ]);
};
