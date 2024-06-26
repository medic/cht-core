import { DataContext } from './data-context';

/**
 * A value that could be `null`.
 */
export type Nullable<T> = T | null;

/** @internal */
export const isNotNull = <T>(value: T | null): value is T => value !== null;

/**
 * An array that is guaranteed to have at least one element.
 */
export type NonEmptyArray<T> = [T, ...T[]];

/** @internal */
export const isNonEmptyArray = <T>(value: T[]): value is NonEmptyArray<T> => !!value.length;

/** @internal */
export const getLastElement = <T>(array: NonEmptyArray<T>): T => array[array.length - 1];

type DataValue = DataPrimitive | DataArray | DataObject;
type DataPrimitive = string | number | boolean | Date | null | undefined;

const isDataPrimitive = (value: unknown): value is DataPrimitive => {
  return value === null
    || value === undefined
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
    || value instanceof Date;
};

interface DataArray extends Readonly<DataValue[]> { }

const isDataArray = (value: unknown): value is DataArray => {
  return Array.isArray(value) && value.every(v => isDataPrimitive(v) || isDataArray(v) || isDataObject(v));
};

/** @internal */
export interface DataObject extends Readonly<Record<string, DataValue>> { }

/** @internal */
export const isDataObject = (value: unknown): value is DataObject => {
  if (!isRecord(value)) {
    return false;
  }
  return Object
    .values(value)
    .every((v) => isDataPrimitive(v) || isDataArray(v) || isDataObject(v));
};

/**
 * Ideally, this function should only be used at the edge of this library (when returning potentially cross-referenced
 * data objects) to avoid unintended consequences if any of the objects are edited in-place. This function should not
 * be used for logic internal to this library since all data objects are marked as immutable.
 * This could be replaced by [structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/structuredClone)
 * in CHT 5.x, or earlier if using a polyfill or a similar implementation like `_.cloneDeep()`.
 * @internal
 */
export const deepCopy = <T extends DataObject | DataArray | DataPrimitive>(value: T): T => {
  if (isDataPrimitive(value)) {
    return value;
  }
  if (isDataArray(value)) {
    return value.map(deepCopy) as unknown as T;
  }

  return Object.fromEntries(
    Object
      .entries(value)
      .map(([key, value]) => [key, deepCopy(value)])
  ) as unknown as T;
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
export interface Identifiable extends DataObject {
  readonly _id: string
}

/** @internal */
export const isIdentifiable = (value: unknown): value is Identifiable => isRecord(value)
  && hasField(value, { name: '_id', type: 'string' });

/** @internal */
export const findById = <T extends Identifiable>(values: T[], id: string): Nullable<T> => values
  .find(v => v._id === id) ?? null;

/** @internal */
export abstract class AbstractDataContext implements DataContext {
  readonly bind = <T>(fn: (ctx: DataContext) => T): T => fn(this);
}
