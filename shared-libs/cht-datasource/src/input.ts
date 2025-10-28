import { convertToUnixTimestamp, DataObject, hasField, hasFields, isRecord } from './libs/core';
import { InvalidArgumentError } from './libs/error';

/**
 * An input for a contact
 */
type ContactInput = DataObject & Readonly<{
  type: string,
  name: string,
  reported_date?: string | number,
  _id?: string,
  _rev?: string
}>;

/**
 * Builds an input object for creation and update of a contact with
 * the given fields.
 * @param data object containing the fields for a contact
 * @returns the contact input
 * @throws Error if data is not an object
 * @throws Error if type is not provided or is empty
 * @throws Error if name is not provided or is empty
 * @throws Error if reported_date is not in a valid format.
 * Valid formats are 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
 * @internal
 */
export const validateContactInputNonAssertive = (data: unknown): Record<string, unknown> => {
  if (!isRecord(data)) {
    throw new InvalidArgumentError('Invalid "data": expected an object.');
  }
  const input = { ...data };
  insertReportedDateIfMissing(input);
  if (!isValidReportedDate(input.reported_date)) {
    throw new InvalidArgumentError(
      'Invalid reported_date. Expected format to be ' +
      '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.'
    );
  }
  input.reported_date = convertToUnixTimestamp(input.reported_date as string | number);
  if (!checkContactInputFields(input)) {
    throw new InvalidArgumentError(
      `Missing or empty required fields (name, type) for [${JSON.stringify(data)}].`
    );
  }
  return input;
};

const insertReportedDateIfMissing = (input: Record<string, unknown>): void => {
  if (!('reported_date' in input)) {
    input.reported_date = new Date().toISOString();
  }
};

/**
 * Returns `true` if the given input is a {@link ContactInput} otherwise `false`.
 * @param input the input to check
 * @returns `true` if the given type is a {@link ContactInput}, otherwise `false`.
 */
export const isContactInput = (input: unknown): input is ContactInput => {
  return checkContactInputFields(input);
};

/** @internal */
const checkContactInputFields = (data: unknown): data is Record<string, unknown> => {
  return isRecord(data) &&
    hasFields(data, [
      { name: 'type', type: 'string', ensureTruthyValue: true },
      { name: 'name', type: 'string', ensureTruthyValue: true }
    ]) &&
    (!('reported_date' in data) || isValidReportedDate(data.reported_date));
};

/**
 * An input for a report
 */
export type ReportInput = Readonly<{
  type: string,
  form: string,
  reported_date?: string | number,
  _id?: string,
  _rev?: string,
  contact: string
}>;

/**
 * Builds an input object for creation and update of a report with
 * the given fields.
 * @param data object containing the fields for a report
 * @returns the report input
 * @throws Error if data is not an object
 * @throws Error if type is not provided or is empty
 * @throws Error if form is not provided or is empty
 * @throws Error if contact is not provided or is empty
 * @throws Error if reported_date is not in a valid format.
 * Valid formats are 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
 */
export const validateReportInput = (data: unknown): ReportInput => {
  if (!isRecord(data)) {
    throw new InvalidArgumentError('Invalid "data": expected an object.');
  }

  const input = { ...data };
  insertReportedDateIfMissing(input);
  if (!isValidReportedDate(input.reported_date)) {
    throw new InvalidArgumentError(
      'Invalid reported_date. Expected format to be ' +
      '\'YYYY-MM-DDTHH:mm:ssZ\', \'YYYY-MM-DDTHH:mm:ss.SSSZ\', or a Unix epoch.'
    );
  }
  input.reported_date = convertToUnixTimestamp(input.reported_date as string | number);
  if (!hasField(input, { name: 'contact', type: 'string', ensureTruthyValue: true })) {
    throw new InvalidArgumentError(`Missing or empty required field (contact) in [${JSON.stringify(data)}].`);
  }
  if (!isReportInput(input)) {
    throw new InvalidArgumentError(`Missing or empty required field (form) in [${JSON.stringify(data)}].`);
  }
  return input;
};

/**
 * Returns `true` if the given input is a {@link ReportInput} otherwise `false`.
 * @param input the input to check
 * @returns `true` if the given type is a {@link ReportInput}, otherwise `false`.
 */
export const isReportInput = (input: unknown): input is ReportInput => {
  if (isRecord(input) &&
    hasFields(input, [
      { name: 'form', type: 'string', ensureTruthyValue: true },
      { name: 'contact', type: 'string', ensureTruthyValue: true }
    ])
  ) {
    if ('reported_date' in input && !isValidReportedDate(input.reported_date)) {
      return false;
    }
    return true;
  }
  return false;
};


/** @internal */
const isValidReportedDate = (value: unknown): boolean => {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string') {
    const isoRegex = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)$/;
    return isoRegex.test(value);
  }

  return false;
};

/**
 * An input for a person
 */
export type PersonInput = ContactInput & Readonly<{
  parent: string;
  date_of_birth?: Date;
  phone?: string;
  patient_id?: string;
  sex?: string;
}>;

/**
 * Builds an input object for creation and update of a person with
 * the given fields.
 * @param data object containing the fields for a person
 * @returns the validated person input
 * @internal
 */
export const validatePersonInput = (data: unknown): PersonInput => {
  const input = validateContactInputNonAssertive(data);

  if (!hasField(input, { name: 'parent', type: 'string', ensureTruthyValue: true })) {
    throw new InvalidArgumentError(`Missing or empty required field (parent) [${JSON.stringify(input)}].`);
  }

  return input as unknown as PersonInput;
};

/** @internal */
export const isPersonInput = (data: unknown): data is PersonInput => {
  if (!checkContactInputFields(data)) {
    return false;
  }

  // `parent` must be present for person, so cannot use `hasInvalidContactLineageForField`
  return hasField(data, { name: 'parent', type: 'string', ensureTruthyValue: true });
};

/**
 * An input for a place
 */
export type PlaceInput = ContactInput & Readonly<{
  parent?: string;
  contact?: string;
  place_id?: string;
}>;

/**
 * Builds an input object for creation and update of a place with the given fields
 * @param data object containing the fields for a person
 * @returns the place input
 * @throws Error if data is not an object
 * @throws Error if type is not provided or is empty
 * @throws Error if name is not provided or is empty
 * @throws Error if parent is not provided or is empty
 * @throws Error if contact is present and empty.
 * @throws Error if reported_date is not in a valid format.
 * Valid formats are 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
 */
export const validatePlaceInput = (data: unknown): PlaceInput => {
  const input = validateContactInputNonAssertive(data);

  if (!isValidPlaceContact(input)) {
    throw new InvalidArgumentError(
      `Missing or empty required field (contact) for [${JSON.stringify(input)}].`
    );
  }

  if (!isValidPlaceParent(input)) {
    throw new InvalidArgumentError(
      `Missing or empty required field (parent) for [${JSON.stringify(input)}].`
    );
  }

  return input as PlaceInput;
};

/** @internal*/
export const isPlaceInput = (data: unknown): data is PlaceInput => {
  if (!checkContactInputFields(data)) {
    return false;
  }

  if (!isValidPlaceParent(data)) {
    return false;
  }

  return isValidPlaceContact(data);
};

/** @internal*/
const isValidPlaceContact = (data: Record<string, unknown>): boolean => {
  if (!hasField(data, { name: 'contact', type: 'string' })) {
    return true;
  }
  // If `contact` is present, it must be a non-empty string.
  return hasField(data, { name: 'contact', type: 'string', ensureTruthyValue: true });
};

const isValidPlaceParent = (data: Record<string, unknown>): boolean => {
  if (!hasField(data, { name: 'parent', type: 'string' })) {
    return true;
  }
  // If `parent` is present, it must be a non-empty string.
  return hasField(data, { name: 'parent', type: 'string', ensureTruthyValue: true });
};
  
