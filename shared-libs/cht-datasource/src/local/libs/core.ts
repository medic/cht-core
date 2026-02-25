import { Nullable } from '../../libs/core';
import { InvalidArgumentError } from '../../libs/error';
import { FreetextQualifier } from '../../qualifier';

/** @internal */
export const validateCursor = (cursor: Nullable<string>): number => {
  const skip = Number(cursor);
  if (isNaN(skip) || skip < 0 || !Number.isInteger(skip)) {
    throw new InvalidArgumentError(`The cursor must be a string or null for first page: [${JSON.stringify(cursor)}].`);
  }
  return skip;
};

/** @internal */
export const normalizeFreetextQualifier = <T extends FreetextQualifier> (qualifier: T): T => {
  return {
    ...qualifier,
    freetext: qualifier.freetext.trim().toLowerCase()
  };
};
