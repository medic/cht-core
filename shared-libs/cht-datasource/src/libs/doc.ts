import { DataObject, hasFields, isRecord } from './core';

export interface Doc extends DataObject {
  _id: string;
  _rev: string;
}

export const isDoc = (value: unknown): value is Doc => {
  return isRecord(value) && hasFields(value, [
    { name: '_id', type: 'string' },
    { name: '_rev', type: 'string' }
  ]);
};
