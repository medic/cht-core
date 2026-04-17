import { DataContext } from './data-context';

/**
 * A value that could be `null`.
 */
export type Nullable<T> = T | null;

/** @internal */
export const isNotNull = <T>(value: T | null): value is T => value !== null;

/**
 * A string representation of a date value (optionally including the time). Valid values are supported parameters
 * for the `Date.parse()` function and the `Date()` constructor.
 * @see https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format
 */
export type DateTimeString = string; // NOSONAR

/** @internal */
export const isDateTimeString = (value: unknown): value is DateTimeString => {
  if (typeof value !== 'string') {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
};

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

type DataArray = readonly DataValue[];

const isDataArray = (value: unknown): value is DataArray => {
  return Array.isArray(value) && value.every(v => isDataPrimitive(v) || isDataArray(v) || isDataObject(v));
};

/**
 * A data object.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
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

/** @internal */
// eslint-disable-next-line func-style
export function assertDataObject (
  value: unknown,
  ErrorClass: new (message: string) => Error = Error
): asserts value is DataObject {
  if (!isDataObject(value)) {
    throw new ErrorClass('Not a valid JSON object value.');
  }
}

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

type FieldType = 'string' | 'number' | 'boolean' | 'function' | 'object';
interface FieldTypeToValue {
  string: string
  number: number
  boolean: boolean
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  function: Function,
  object: object
}
interface FieldDescriptor<N extends string, K extends FieldType> {
  name: N;
  type: K;
}

/** @internal */
export const hasField = <T extends Record<string, unknown>, N extends string, K extends FieldType>(
  value: T,
  { name, type }: FieldDescriptor<N, K>
): value is T & Record<N, FieldTypeToValue[K]> => typeof value[name] === type;

const isBlankString = (value: unknown): boolean => typeof value === 'string' && !value.trim();

/** @internal */
export const hasStringFieldWithValue = <T extends Record<string, unknown>, N extends string>(
  value: T,
  fieldName: N
): value is T & Record<N, string> => {
  return hasField(value, { name: fieldName, type: 'string' }) && !isBlankString(value[fieldName]);
};

/** @internal */
export const assertDoesNotHaveField = (
  value: Record<string, unknown>,
  name: string,
  ErrorClass: new (message: string) => Error = Error
): void => {
  if (!(value[name] === undefined || value[name] === null)) {
    throw new ErrorClass(`The [${name}] field must not be set.`);
  }
};

/** @internal */
// eslint-disable-next-line func-style
export function assertHasOptionalField <T extends Record<string, unknown>, N extends string, K extends FieldType>(
  value: T,
  { name, type }: FieldDescriptor<N, K>,
  ErrorClass: new (message: string) => Error = Error
): asserts value is T & Record<N, FieldTypeToValue[K] | undefined> {
  if (name in value && !hasField(value, { name, type })) {
    throw new ErrorClass(`The [${name}] field must have the type [${type}].`);
  }
}

/** @internal */
// eslint-disable-next-line func-style
export function assertHasRequiredField <T extends Record<string, unknown>, N extends string, K extends FieldType>(
  value: T,
  { name, type }: FieldDescriptor<N, K>,
  ErrorClass: new (message: string) => Error = Error
): asserts value is T & Record<N, FieldTypeToValue[K]> {
  if (!hasField(value, { name, type }) || isBlankString(value[name])) {
    throw new ErrorClass(`The [${name}] field must have a [${type}] value.`);
  }
}

/**
 * An identifiable entity.
 */
export interface Identifiable extends DataObject {
  readonly _id: string
}

/** @internal */
export const isIdentifiable = (value: unknown): value is Identifiable => isRecord(value)
  && hasStringFieldWithValue(value, '_id');

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
  fetchFunction: (args: S, s: Nullable<string>, l?: number) => Promise<Page<T>>,
  fetchFunctionArgs: S
): AsyncGenerator<T, null> {
  let currentCursor: Nullable<string> = null;
  do {
    const { data, cursor } = await fetchFunction(fetchFunctionArgs, currentCursor);
    for (const entry of data) {
      yield entry;
    }

    currentCursor = cursor;
  } while (currentCursor);

  return null;
};

/**
 * Parent lineage data for an entity.
 */
export interface NormalizedParent extends DataObject, Identifiable {
  readonly parent?: NormalizedParent;
}

/** @ignore */
export const isNormalizedParent = (value: unknown): value is NormalizedParent => {
  return isDataObject(value) && isIdentifiable(value) && (!value.parent || isNormalizedParent(value.parent));
};
