import { DataContext } from './data-context';
import {ContactTypeQualifier, FreetextQualifier, isContactTypeQualifier, isFreetextQualifier} from '../qualifier';
import { InvalidArgumentError } from './error';

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

/**
 * Represents a page of results. The `data` array contains the results for this page. The `cursor` field contains a
 * token that can be used to fetch the next page of results. If no `cursor` value is returned, there are no additional
 * results available. (Note that no assumptions should be made about the _contents_ of the cursor string.)
 * @typeParam T the type of the data in the page
 */
export interface Page<T> {
  readonly data: T[];
  readonly cursor: Nullable<string>;
}

/** @internal */
export const getPagedGenerator = async function* <S, T>(
  fetchFunction: (args: S, s: Nullable<string>, l: number) => Promise<Page<T>>,
  fetchFunctionArgs: S
): AsyncGenerator<T, null> {
  const limit = 100;
  let cursor: Nullable<string> =  null;

  do {
    const docs = await fetchFunction(fetchFunctionArgs, cursor, limit);

    for (const doc of docs.data) {
      yield doc;
    }

    cursor = docs.cursor;
  } while (cursor);

  return null;
};

/** @internal */
export const assertTypeQualifier: (qualifier: unknown) => asserts qualifier is ContactTypeQualifier = (
  qualifier: unknown
) => {
  if (!isContactTypeQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid contact type [${JSON.stringify(qualifier)}].`);
  }
};

/** @internal */
export const assertLimit: (limit: unknown) => asserts limit is number = (limit: unknown) => {
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit <= 0) {
    throw new InvalidArgumentError(`The limit must be a positive number: [${String(limit)}].`);
  }
};

/** @internal */
export const assertCursor: (cursor: unknown) => asserts cursor is Nullable<string> = (cursor: unknown) => {
  if (cursor !== null && (typeof cursor !== 'string' || !cursor.length)) {
    throw new InvalidArgumentError(`Invalid cursor token: [${String(cursor)}].`);
  }
};

/** @internal */
export const assertFreetextQualifier: (qualifier: unknown) => asserts qualifier is FreetextQualifier = (
  qualifier: unknown
) => {
  if (!isFreetextQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid invalid freetext [${JSON.stringify(qualifier)}].`);
  }
};
