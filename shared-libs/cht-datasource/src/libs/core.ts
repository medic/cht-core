/**
 * A value that could be <code>null</code>.
 */
export type Nullable<T> = T | null;

/**
 * An array that is guaranteed to have at least one element.
 */
export type NonEmptyArray<T> = [T, ...T[]];

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object';
};

export const hasField = (value: Record<string, unknown>, field: { name: string, type: string }) => {
  const valueField = value[field.name];
  return typeof valueField === field.type;
};

export const hasFields = (value: Record<string, unknown>, fields: NonEmptyArray<{ name: string, type: string }>) => {
  return fields.every(field => hasField(value, field));
};
