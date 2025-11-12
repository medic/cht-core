import { InvalidArgumentError } from './error';
import {
  ContactTypeQualifier,
  ContactUuidsQualifier,
  FreetextQualifier,
  ReportingPeriodQualifier,
  UuidQualifier,
  isContactTypeQualifier,
  isContactUuidsQualifier,
  isFreetextQualifier,
  isReportingPeriodQualifier,
  isUuidQualifier,
} from '../qualifier';
import { Nullable } from './core';

/** @internal */
export const assertTypeQualifier: (qualifier: unknown) => asserts qualifier is ContactTypeQualifier = (
  qualifier: unknown
) => {
  if (!isContactTypeQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid contact type [${JSON.stringify(qualifier)}].`);
  }
};

/** @internal */
export const assertTargetIntervalQualifier: (qualifier: unknown) => asserts qualifier is (
  ReportingPeriodQualifier & ContactUuidsQualifier
) = (qualifier: unknown) => {
  if (!(isContactUuidsQualifier(qualifier) && isReportingPeriodQualifier(qualifier))) {
    throw new InvalidArgumentError(`Invalid target intervals qualifier [${JSON.stringify(qualifier)}].`);
  }
};

/** @internal */
export const assertLimit: (limit: unknown) => asserts limit is number | `${number}` = (limit: unknown) => {
  const numberLimit = Number(limit);
  if (!Number.isInteger(numberLimit) || numberLimit <= 0) {
    throw new InvalidArgumentError(`The limit must be a positive integer: [${JSON.stringify(limit)}].`);
  }
};

/** @internal */
export const assertCursor: (cursor: unknown) => asserts cursor is Nullable<string> = (cursor: unknown) => {
  if (cursor !== null && (typeof cursor !== 'string' || !cursor.length)) {
    throw new InvalidArgumentError(`The cursor must be a string or null for first page: [${JSON.stringify(cursor)}].`);
  }
};

/** @internal */
export const assertFreetextQualifier: (qualifier: unknown) => asserts qualifier is FreetextQualifier = (
  qualifier: unknown
) => {
  if (!isFreetextQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid freetext [${JSON.stringify(qualifier)}].`);
  }
};

/** @internal */
export const assertContactTypeFreetextQualifier: (
  qualifier: unknown
) => asserts qualifier is ContactTypeQualifier | FreetextQualifier = (
  qualifier: unknown
) => {
  if (!(isContactTypeQualifier(qualifier) || isFreetextQualifier(qualifier))) {
    throw new InvalidArgumentError(
      `Invalid qualifier [${JSON.stringify(qualifier)}]. Must be a contact type and/or freetext qualifier.`
    );
  }
};

/** @internal */
export const assertUuidQualifier: (qualifier: unknown) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
  if (!isUuidQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid identifier [${JSON.stringify(qualifier)}].`);
  }
};

/** @ignore */
export const isContactType = (value: ContactTypeQualifier | FreetextQualifier): value is ContactTypeQualifier => {
  return 'contactType' in value;
};

/** @ignore */
export const isFreetextType = (value: ContactTypeQualifier | FreetextQualifier): value is FreetextQualifier => {
  return 'freetext' in value;
};

/** @ignore */
export const isContactTypeAndFreetextType = (
  qualifier: ContactTypeQualifier | FreetextQualifier
): qualifier is ContactTypeQualifier & FreetextQualifier => {
  return isContactType(qualifier) && isFreetextType(qualifier);
};
