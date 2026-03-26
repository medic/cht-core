import { DataObject, Nullable } from '../../libs/core';
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

/** @internal*/
export const assertFieldsUnchanged = (
  original: DataObject,
  updated: DataObject,
  keys: string[]
): void => {
  const changedFields = keys.filter((key) => original[key] !== updated[key]);
  if (changedFields.length) {
    throw new InvalidArgumentError(`The [${changedFields}] fields must not be changed.`);
  }
};

const convertToUnixTimestamp = (date: string | number): number => {
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) {
    throw new InvalidArgumentError(`Invalid date value [${date}].`);
  }

  return timestamp;
};


/** @internal */
export const getReportedDateTimestamp = (
  reportedDate?: string | number
): number => convertToUnixTimestamp(reportedDate ?? Date.now());
