import { DataObject, hasField, Identifiable, isIdentifiable, isRecord } from './core';

/**
 * A document from the database.
 */
export interface Doc extends DataObject, Identifiable {
  readonly _rev: string;
}

/** @internal */
export const isDoc = (value: unknown): value is Doc => isRecord(value)
  && isIdentifiable(value)
  && hasField(value, { name: '_rev', type: 'string' });
