import { DataContext } from './data-context';

/**
 * A value that could be `null`.
 */
export type Nullable<T> = T | null;

/**
 * An array that is guaranteed to have at least one element.
 */
export type NonEmptyArray<T> = [T, ...T[]];

/** @internal */
export const isNonEmptyArray = <T>(value: T[]): value is NonEmptyArray<T> => !!value.length;

type DataPrimitive = string | number | boolean | Date | null | undefined;

const isDataPrimitive = (value: unknown): value is DataPrimitive => {
  return value === null
    || value === undefined
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || value instanceof Date;
};

interface DataArray extends Readonly<(DataPrimitive | DataArray | DataObject)[]> { }

const isDataArray = (value: unknown): value is DataArray => {
  return Array.isArray(value) && value.every(v => isDataPrimitive(v) || isDataArray(v) || isDataObject(v));
};

/** @internal */
export interface DataObject extends Readonly<Record<string, DataPrimitive | DataArray | DataObject>> { }

/** @internal */
export const isDataObject = (value: unknown): value is DataObject => {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((v) => isDataPrimitive(v) || isDataArray(v) || isDataObject(v));
};

/** @internal */
export const deepCopy = <T extends DataObject | DataArray | DataPrimitive>(value: T): T => {
  if (isDataPrimitive(value)) {
    return value;
  }
  if (isDataArray(value)) {
    return value.map(deepCopy) as unknown as T;
  }
  return { ...Object.values(value).map(deepCopy) } as unknown as T;
};

/** @internal */
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

/** @internal */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object';
};

/** @internal */
export const hasField = (value: Record<string, unknown>, field: { name: string, type: string }): boolean => {
  const valueField = value[field.name];
  return typeof valueField === field.type;
};

/** @internal */
export const hasFields = (
  value: Record<string, unknown>,
  fields: NonEmptyArray<{ name: string, type: string }>
): boolean => fields.every(field => hasField(value, field));

/** @internal */
export abstract class AbstractDataContext implements DataContext {
  readonly bind = <T>(fn: (ctx: DataContext) => T): T => fn(this);
}
