import { hasFields, isRecord } from './core';

type DataPrimitive = string | number | boolean | Date | null | undefined;

interface DocArray extends Readonly<(DataPrimitive | DocArray | Doc)[]> { }

export interface Doc extends Readonly<Record<string, DataPrimitive | DocArray | Doc>> {
  _id: string;
  _rev: string;
}

export const isDoc = (value: unknown): value is Doc => {
  return isRecord(value) && hasFields(value, [
    { name: '_id', type: 'string' },
    { name: '_rev', type: 'string' }
  ]);
};
