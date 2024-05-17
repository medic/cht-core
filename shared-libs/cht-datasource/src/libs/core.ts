/**
 * A value that could be `null`.
 */
export type Nullable<T> = T | null;

/**
 * An array that is guaranteed to have at least one element.
 */
export type NonEmptyArray<T> = [T, ...T[]];

type DataPrimitive = string | number | boolean | Date | null | undefined;
interface DataArray extends Readonly<(DataPrimitive | DataArray | DataObject)[]> { }
/** @internal */
export interface DataObject extends Readonly<Record<string, DataPrimitive | DataArray | DataObject>> { }

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
