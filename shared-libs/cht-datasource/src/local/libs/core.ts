import { Nullable } from '../../libs/core';
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
  return freetext.trim().toLowerCase();
};
type QueryKey = string | string[];
/** @internal */
export interface QueryParams {
  key?: QueryKey;
  startKey?: QueryKey;
  endKey?: QueryKey;
  limit?: number;
  cursor?: Nullable<string>;
}
