import { Nullable } from '../../libs/core';
import { InvalidArgumentError } from '../../libs/error';

/** @internal */
export const validateCursor = (cursor: Nullable<string>): number => {
  const skip = Number(cursor);
  if (isNaN(skip) || skip < 0 || !Number.isInteger(skip)) {
    throw new InvalidArgumentError(`The cursor must be a string or null for first page: [${String(cursor)}].`);
  }
  return skip;
};

/** @internal */
export const normalizeFreetext = (
  freetext: string,
): string => {
  return freetext.trim().toLowerCase();
};
