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

/** @internal */
export interface QueryByKeyParams {
  key: string | string[];
  limit: number;
  skip: number;
}

/** @internal */
export interface QueryByRangeParams {
  startKey: string | string[];
  endKey: string;
  limit: number;
  skip: number;
}
