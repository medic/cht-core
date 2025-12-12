import { DataContext } from './data-context';
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

type DataArray = readonly DataValue[];

const isDataArray = (value: unknown): value is DataArray => {
  return Array.isArray(value) && value.every(v => isDataPrimitive(v) || isDataArray(v) || isDataObject(v));
};

/** @internal */
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
    throw new ErrorClass('Invalid data object value.');
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
      .map(([ key, value ]) => [ key, deepCopy(value) ])
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

type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'function' | 'object';
interface FieldTypeToValue {
  string: string
  number: number
  boolean: boolean
  date: Date,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  function: Function,
  object: object
}
interface FieldDescriptor<K extends FieldType> {
  name: string;
  type: K;
}

/** @internal */
export const hasField = <T extends Record<string, unknown>, K extends FieldType>(
  value: T,
  { name, type }: FieldDescriptor<K>
): value is T & Record<typeof name, FieldTypeToValue[K]> => {
  const fieldValue = value[name];
  if (type === 'date') {
    return fieldValue instanceof Date;
  }
  return typeof fieldValue === type;
};

/** @internal */
export const hasFields = <K extends FieldType>(
  value: Record<string, unknown>,
  fields: NonEmptyArray<FieldDescriptor<K>>,
): boolean => fields.every(field => hasField(value, field));

/** @internal */
export const hasStringFieldWithValue = <T extends Record<string, unknown>>(
  value: T,
  fieldName: string
): value is T & Record<typeof fieldName, string> => {
  return hasField(value, { name: fieldName, type: 'string' }) && !!(value[fieldName].trim());
};

/** @internal */
export const assertDoesNotHaveField = (
  value: Record<string, unknown>,
  name: string,
  ErrorClass: new (message: string) => Error = Error
): void => {
  if (!(value[name] === undefined || value[name] === null)) {
    throw new ErrorClass(`Field ${String(name)} is not allowed.`);
  }
};

/** @internal */
// eslint-disable-next-line func-style
export function assertHasOptionalField <T extends Record<string, unknown>, K extends FieldType>(
  value: T,
  { name, type }: FieldDescriptor<K>,
  ErrorClass: new (message: string) => Error = Error
): asserts value is T & Record<typeof name, FieldTypeToValue[K] | undefined> {
  if (name in value && !hasField(value, { name, type })) {
    throw new ErrorClass(`Invalid ${String(name)} value.`);
  }
}

/** @internal */
// eslint-disable-next-line func-style
export function assertHasRequiredField <T extends Record<string, unknown>, K extends FieldType>(
  value: T,
  { name, type }: FieldDescriptor<K>,
  ErrorClass: new (message: string) => Error = Error
): asserts value is T & Record<typeof name, FieldTypeToValue[K]> {
  if (!hasField(value, { name, type }) || !value[name]) {
    throw new ErrorClass(`Missing or empty required field (${String(name)})`);
  }
}

/** @internal */
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
  fetchFunction: (args: S, s: Nullable<string>, l: number) => Promise<Page<T>>,
  fetchFunctionArgs: S
): AsyncGenerator<T, null> {
  const limit = 100;
  let cursor: Nullable<string> =  null;
  let docs: Page<T>;
  const getDocsDataLength = (docs: Page<T>) => docs.data.length;

  do {
    docs = await fetchFunction(fetchFunctionArgs, cursor, limit);

    for (const doc of docs.data) {
      yield doc;
    }

    cursor = docs.cursor;
    // 1. W10= is the base64 representation of an empty array which is returned by Nouveau which will evaluate to '[]'
    // 2. This check was changed because in online mode(querying Nouveau) the cursor returned can be not W10= so to
    //    prevent infinite querying the check for existence of docs was required
  } while (getDocsDataLength(docs) > 0 && cursor && atob(cursor) !== '[]');

  return null;
};

/** @internal */
export interface NormalizedParent extends DataObject, Identifiable {
  readonly parent?: NormalizedParent;
}

/** @ignore */
export const isNormalizedParent = (value: unknown): value is NormalizedParent => {
  return isDataObject(value) && isIdentifiable(value) && (!value.parent || isNormalizedParent(value.parent));
};

/** @internal */
export const convertToUnixTimestamp = (date: string | number): number => {
  if (typeof date === 'number') {
    return date;
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new InvalidArgumentError(
      'Invalid reported_date. Expected format to be ' +
      '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.'
    );
  }

  return parsedDate.getTime();
};

/** @internal */
export interface NouveauHit {
  order: {
    value: string | number;
    '@type': string;
  }[];
  id: string;
  fields: {
    sort_order: string;
    [key: string]: unknown;  // For any other fields that might be present
  };
  doc?: unknown;  // Optional document data
}

/** @internal */
export interface NouveauResponse {
  update_latency: number;
  total_hits_relation: string;
  total_hits: number;
  ranges: null;
  hits: NouveauHit[];
  counts: null;
  bookmark: string;
}
