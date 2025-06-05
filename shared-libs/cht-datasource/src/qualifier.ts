import { isString, hasField, isRecord, Nullable, hasFields } from './libs/core';
import { InvalidArgumentError } from './libs/error';

/**
 * A qualifier that identifies an entity by its UUID.
 */
export type UuidQualifier = Readonly<{ uuid: string }>;

/**
 * Builds a qualifier that identifies an entity by its UUID.
 * @param uuid the UUID of the entity
 * @returns the qualifier
 * @throws Error if the UUID is invalid
 */
export const byUuid = (uuid: string): UuidQualifier => {
  if (!isString(uuid) || uuid.length === 0) {
    throw new InvalidArgumentError(`Invalid UUID [${JSON.stringify(uuid)}].`);
  }
  return { uuid };
};

/**
 * Returns `true` if the given qualifier is a {@link UuidQualifier}, otherwise `false`.
 * @param identifier the identifier to check
 * @returns `true` if the given identifier is a {@link UuidQualifier}, otherwise
 * `false`
 */
export const isUuidQualifier = (identifier: unknown): identifier is UuidQualifier => {
  return isRecord(identifier) && hasField(identifier, { name: 'uuid', type: 'string' });
};

/**
 * A qualifier that identifies contacts based on type.
 */
export type ContactTypeQualifier = Readonly<{ contactType: string }>;

/**
 * Build the TypeQualifier that categorizes an entity by its type
 * @param contactType the type of the entity
 * @returns the type
 * @throws Error if the type is invalid
 */
export const byContactType = (contactType: string): ContactTypeQualifier => {
  if (!isString(contactType) || contactType.length === 0) {
    throw new InvalidArgumentError(`Invalid contact type [${JSON.stringify(contactType)}].`);
  }

  return { contactType };
};

/**
 * Returns `true` if the given qualifier is a {@link ContactTypeQualifier} otherwise `false`.
 * @param contactType the type to check
 * @returns `true` if the given type is a {@link ContactTypeQualifier}, otherwise `false`.
 */
export const isContactTypeQualifier = (contactType: unknown): contactType is ContactTypeQualifier => {
  return isRecord(contactType) && hasField(contactType, { name: 'contactType', type: 'string' });
};

/**
 * A qualifier that identifies entities based on a freetext search string.
 */
export type FreetextQualifier = Readonly<{ freetext: string }>;

/**
 * Builds a qualifier for finding entities by the given freetext string.
 * @param freetext the text to search with
 * @returns the qualifier
 * @throws Error if the search string is not invalid
 *
 * See {@link isFreetextQualifier} for validity of a search string.
 */
export const byFreetext = (freetext: string): FreetextQualifier => {
  const qualifier = { freetext };
  if (!isFreetextQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid freetext [${JSON.stringify(freetext)}].`);
  }

  return qualifier;
};

/**
 * Returns `true` if the given qualifier is a {@link FreetextQualifier} otherwise `false`.
 *
 * The condition for being a valid freetext is that the qualifier should have a `freetext`
 * key and the value should be a string which is more than 3 characters in length. The
 * additional condition is that the value should not contain a whitespace(' ') unless
 * the value is in the `key:value` pattern.
 * @param qualifier the qualifier to check
 * @returns `true` if the given type is a {@link FreetextQualifier}, otherwise `false`.
 * @example
 * // valid
 * { freetext: 'abc' }
 * // valid
 * { freetext: 'key:value with spaces' }
 * @example
 * // invalid
 * { freetext: 'value with spaces' }
 */
export const isFreetextQualifier = (qualifier: unknown): qualifier is FreetextQualifier => {
  return isRecord(qualifier) &&
    hasField(qualifier, { name: 'freetext', type: 'string' }) &&
    qualifier.freetext.length >= 3 &&
    (qualifier.freetext.includes(':') || !/\s+/.test(qualifier.freetext));
};

/**
 * Returns `true` if the given FreetextQualifier is also a Key-Value based qualifier in the pattern "key:value"
 * @param qualifier the FreetextQualifier to check
 * @returns `true` if the given FreetextQualifier is also a Key-Value based qualifier
 */
export const isKeyedFreetextQualifier = (qualifier: FreetextQualifier): boolean => {
  if (isFreetextQualifier(qualifier)) {
    return qualifier.freetext.includes(':');
  }

  return false;
};

/**
 * Combines multiple qualifiers into a single object.
 * @returns the combined qualifier
 * @throws Error if any of the qualifiers contain intersecting property names
 */
export const and = <
  A,
  B,
  C = Nullable<object>,
  D = Nullable<object>
>(
    qualifierA: A,
    qualifierB: B,
    qualifierC?: C,
    qualifierD?: D
  ): A & B & Partial<C> & Partial<D> => {
  return {
    ...qualifierA,
    ...qualifierB,
    ...(qualifierC ?? {}),
    ...(qualifierD ?? {}),
  };
};

/** 
 * A qualifier for a contact
 */
type ContactQualifier = Readonly<{
  type: string,
  name: string,
  reported_date?: string | number,
  _id?: string,
  _rev?: string
}>;

/**
 * Builds a qualifier for creation and update of a contact with
 * the given fields.
 * @param data object containing the fields for a contact
 * @returns the contact qualifier
 * @throws Error if data is not an object
 * @throws Error if type is not provided or is empty
 * @throws Error if name is not provided or is empty
 * @throws Error if reported_date is not in a valid format. 
 * Valid formats are 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
 */
export const byContactQualifier = (data: unknown): ContactQualifier => {
  if (!isRecord(data)){
    throw new InvalidArgumentError('Invalid "data": expected an object.');
  }
  const qualifier = {...data};
  if ('reported_date' in qualifier && !isValidReportedDate(qualifier.reported_date)){
    throw new InvalidArgumentError(
      // eslint-disable-next-line max-len
      `Invalid reported_date. Expected format to be 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or a Unix epoch.`
    );
  }
  if (!isContactQualifier(qualifier)){
    throw new InvalidArgumentError(`Missing or empty required fields [${JSON.stringify(data)}].`);
  }
  return qualifier;
};

/**
 * Returns `true` if the given qualifier is a {@link ContactQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given type is a {@link ContactQualifier}, otherwise `false`.
 */
export const isContactQualifier = (qualifier: unknown): qualifier is ContactQualifier => {
  if (isRecord(qualifier) && hasFields(qualifier, [{name: 'type', type: 'string', ensure_truthy_value: true}, 
    {name: 'name', type: 'string', ensure_truthy_value: true}])){
    if ('reported_date' in qualifier && !isValidReportedDate(qualifier.reported_date)){
      return false;
    }
    return true;
  }
  return false;
};

/** 
 * A qualifier for a report
 */
type ReportQualifier = Readonly<{
  type: string,
  form: string,
  reported_date?: string | number,
  _id?: string,
  _rev?: string
}>;

/**
 * Builds a qualifier for creation and update of a report with
 * the given fields.
 * @param data object containing the fields for a report
 * @returns the report qualifier
 * @throws Error if data is not an object
 * @throws Error if type is not provided or is empty
 * @throws Error if form is not provided or is empty
 * @throws Error if reported_date is not in a valid format.
 * Valid formats are 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
 */
export const byReportQualifier = (data: unknown): ReportQualifier => {
  if (!isRecord(data)) {
    throw new InvalidArgumentError('Invalid "data": expected an object.');
  }
  const qualifier = {...data};
  if ('reported_date' in qualifier && !isValidReportedDate(qualifier.reported_date)) {
    throw new InvalidArgumentError(
      // eslint-disable-next-line max-len
      `Invalid reported_date. Expected format to be 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or a Unix epoch.`
    );
  }
  if (!isReportQualifier(qualifier)) {
    throw new InvalidArgumentError(`Missing or empty required fields [${JSON.stringify(data)}].`);
  }
  return qualifier;
};

/**
 * Returns `true` if the given qualifier is a {@link ReportQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given type is a {@link ReportQualifier}, otherwise `false`.
 */
export const isReportQualifier = (qualifier: unknown): qualifier is ReportQualifier => {
  if (isRecord(qualifier) && 
      hasFields(qualifier, [{name: 'type', type: 'string', ensure_truthy_value: true}, 
        {name: 'form', type: 'string', ensure_truthy_value: true}])
  ){
    if ('reported_date' in qualifier && !isValidReportedDate(qualifier.reported_date)){
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
