import { InvalidArgumentError } from './error';
import {
  ContactTypeQualifier,
  FreetextQualifier,
  isContactTypeQualifier,
  isFreetextQualifier,
  isUuidQualifier,
  UuidQualifier,
} from '../qualifier';
import {
  assertDataObject,
  assertDoesNotHaveField,
  assertHasOptionalField,
  assertHasRequiredField,
  DataObject,
  Nullable
} from './core';
import * as Input from '../input';
import { ISO_8601_DATE_PATTERN } from './constants';

/** @internal */
export const assertTypeQualifier: (qualifier: unknown) => asserts qualifier is ContactTypeQualifier = (
  qualifier: unknown
) => {
  if (!isContactTypeQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid contact type [${JSON.stringify(qualifier)}].`);
  }
};

const isValidReportedDate = (value: unknown): value is string | number => {
  if (typeof value === 'number') {
    return Number.isInteger(value);
  }

  return typeof value === 'string' && ISO_8601_DATE_PATTERN.test(value);
};

// eslint-disable-next-line func-style
function assertReportedDate<T extends DataObject>(
  data: T
): asserts data is T & { reported_date?: string | number } {
  if (data.reported_date && !isValidReportedDate(data.reported_date)) {
    throw new InvalidArgumentError(
      `Invalid reported_date [${JSON.stringify(data.reported_date)}]. Expected format to be ` +
      '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.'
    );
  }
}

// eslint-disable-next-line func-style
function assertContactInput(data: unknown): asserts data is Input.v1.ContactInput {
  assertDataObject(data, InvalidArgumentError);
  assertHasRequiredField(data, { name: 'type', type: 'string' }, InvalidArgumentError);
  assertHasRequiredField(data, { name: 'name', type: 'string' }, InvalidArgumentError);
  assertReportedDate(data);
  assertDoesNotHaveField(data, '_id', InvalidArgumentError);
  assertDoesNotHaveField(data, '_rev', InvalidArgumentError);
}


/** @internal */
// eslint-disable-next-line func-style
export function assertPersonInput(data: unknown): asserts data is Input.v1.PersonInput {
  assertContactInput(data);
  assertHasRequiredField(data, { name: 'parent', type: 'string' }, InvalidArgumentError);
  assertHasOptionalField(data, { name: 'date_of_birth', type: 'date' }, InvalidArgumentError);
  assertHasOptionalField(data, { name: 'phone', type: 'string' }, InvalidArgumentError);
  assertHasOptionalField(data, { name: 'patient_id', type: 'string' }, InvalidArgumentError);
  assertHasOptionalField(data, { name: 'sex', type: 'string' }, InvalidArgumentError);
}


/** @internal */
// eslint-disable-next-line func-style
export function assertPlaceInput(data: unknown): asserts data is Input.v1.PlaceInput {
  assertContactInput(data);
  assertHasOptionalField(data, { name: 'parent', type: 'string' }, InvalidArgumentError);
  assertHasOptionalField(data, { name: 'contact', type: 'string' }, InvalidArgumentError);
  assertHasOptionalField(data, { name: 'place_id', type: 'string' }, InvalidArgumentError);
}

/** @internal */
// eslint-disable-next-line func-style
export function assertReportInput(data: unknown): asserts data is Input.v1.ReportInput {
  assertDataObject(data);
  assertHasRequiredField(data, { name: 'form', type: 'string' }, InvalidArgumentError);
  assertReportedDate(data);
  assertHasRequiredField(data, { name: 'contact', type: 'string' }, InvalidArgumentError);
  assertDoesNotHaveField(data, '_id', InvalidArgumentError);
  assertDoesNotHaveField(data, '_rev', InvalidArgumentError);
}

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
