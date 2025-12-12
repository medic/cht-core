import { convertToUnixTimestamp, DataObject, hasStringFieldWithValue, isRecord, Nullable } from '../../libs/core';
import { InvalidArgumentError } from '../../libs/error';

/** @internal */
export const validateCursor = (cursor: Nullable<string>): number => {
  const skip = Number(cursor);
  if (isNaN(skip) || skip < 0 || !Number.isInteger(skip)) {
    throw new InvalidArgumentError(`The cursor must be a string or null for first page: [${JSON.stringify(cursor)}].`);
  }
  return skip;
};

/** @internal */
export const normalizeFreetext = (
  freetext: string,
): string => {
  return freetext
    .trim()
    .toLowerCase();
};

/** @internal */
export type QueryKey = string | string[];

/** @internal */
export interface QueryParams {
  key?: QueryKey;
  startKey?: QueryKey;
  endKey?: QueryKey;
  limit?: number;
  cursor?: Nullable<string>;
}

const assertFieldUnchanged = (original: DataObject, updated: DataObject, key: string) => {
  if (original[key] === updated[key]) {
    return;
  }

  throw new InvalidArgumentError(
    `Value ${JSON.stringify(
      updated[key]
    )} of immutable field '${key}' does not match with the original doc`
  );
};

/** @internal*/
export const assertFieldsUnchanged = (
  original: DataObject,
  updated: DataObject,
  keys: string[]
): void => keys.forEach((key) => assertFieldUnchanged(original, updated, key));

/** @internal */
export const getReportedDateTimestamp = (
  reportedDate?: string | number
): number => convertToUnixTimestamp(reportedDate ?? Date.now());
