import { hasField, isRecord, isString } from './libs/core';
import { InvalidArgumentError } from './libs/error';

/**
 * A qualifier that identifies an entity by its UUID.
 */
export type UuidQualifier = Readonly<{ uuid: string }>;

/**
 * Builds a qualifier that identifies an entity by its UUID.
 * @param uuid the UUID of the entity
 * @returns the qualifier
 * @throws InvalidArgumentError if the UUID is invalid
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
 * @throws InvalidArgumentError if the type is invalid
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
 * @throws InvalidArgumentError if the search string is not valid
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
 * A qualifier that identifies entities based on a reporting period (e.g. a calendar month). The reporting period
 * should be represented with the format YYYY-MM (e.g. "2025-07").
 */
export interface ReportingPeriodQualifier {
  readonly reportingPeriod: string;
}

const REPORTING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Returns `true` if the given qualifier is a {@link ReportingPeriodQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is a {@link ReportingPeriodQualifier}, otherwise `false`.
 */
export const isReportingPeriodQualifier = (qualifier: unknown): qualifier is ReportingPeriodQualifier => {
  return isRecord(qualifier) &&
    hasField(qualifier, { name: 'reportingPeriod', type: 'string' }) &&
    REPORTING_PERIOD_PATTERN.test(qualifier.reportingPeriod);
};

/**
 * Builds a qualifier for finding entities by reporting period.
 * @param reportingPeriod the reporting period to search with
 * @returns the qualifier
 * @throws InvalidArgumentError if the reporting period is not valid
 */
export const byReportingPeriod = (reportingPeriod: string): ReportingPeriodQualifier => {
  const qualifier = { reportingPeriod };
  if (!isReportingPeriodQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid reporting period [${reportingPeriod}].`);
  }
  return qualifier;
};

/**
 * A qualifier that identifies entities based on a username (without the "org.couchdb.user:" prefix).
 */
export interface UsernameQualifier {
  readonly username: string
}

/**
 * Returns `true` if the given qualifier is a {@link UsernameQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is a {@link UsernameQualifier}, otherwise `false`.
 */
export const isUsernameQualifier = (qualifier: unknown): qualifier is UsernameQualifier => {
  return isRecord(qualifier) &&
    hasField(qualifier, { name: 'username', type: 'string' }) &&
    qualifier.username.length > 0;
};

/**
 * Builds a qualifier for finding entities by username.
 * @param username the username to search with
 * @returns the qualifier
 * @throws InvalidArgumentError if the username is not valid
 */
export const byUsername = (username: string): UsernameQualifier => {
  const qualifier = { username };
  if (!isUsernameQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid username [${username}].`);
  }
  return qualifier;
};

/**
 * A qualifier that identifies entities based their association with the identified contact.
 */
export interface ContactUuidQualifier {
  readonly contactUuid: string
}

/**
 * Returns `true` if the given qualifier is a {@link ContactUuidQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is a {@link ContactUuidQualifier}, otherwise `false`.
 */
export const isContactUuidQualifier = (qualifier: unknown): qualifier is ContactUuidQualifier => {
  return isRecord(qualifier) &&
    hasField(qualifier, { name: 'contactUuid', type: 'string' }) &&
    qualifier.contactUuid.length > 0;
};

/**
 * Builds a qualifier for finding entities by contact UUID.
 * @param contactUuid the contact UUID to search with
 * @returns the qualifier
 * @throws InvalidArgumentError if the contact UUID is not valid
 */
export const byContactUuid = (contactUuid: string): ContactUuidQualifier => {
  const qualifier = { contactUuid };
  if (!isContactUuidQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid contact UUID [${contactUuid}].`);
  }
  return qualifier;
};

/**
 * A qualifier that identifies entities based their association with the identified contacts.
 */
export interface ContactUuidsQualifier {
  readonly contactUuids: [string, ...string[]]
}

/**
 * Returns `true` if the given qualifier is a {@link ContactUuidsQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is a {@link ContactUuidsQualifier}, otherwise `false`.
 */
export const isContactUuidsQualifier = (qualifier: unknown): qualifier is ContactUuidsQualifier => {
  return isRecord(qualifier) &&
    hasField(qualifier, { name: 'contactUuids', type: 'string' }) &&
    qualifier.contactUuids.length > 0 &&
    (qualifier as unknown as ContactUuidsQualifier)
      .contactUuids
      .every(contactUuid => contactUuid.length > 0);
};

export const byContactUuids = (contactUuids: [string, ...string[]]): ContactUuidsQualifier => {
  const qualifier = { contactUuids };
  if (!isContactUuidQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid contact UUIDs [${contactUuids}].`);
  }
  return qualifier;
}

// https://stackoverflow.com/a/50375286
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Combines multiple qualifiers into a single object.
 * @returns the combined qualifier
 * @throws Error if any of the qualifiers contain intersecting property names
 */
export const and = <A, B, C extends object[]>(
  qualifierA: A,
  qualifierB: B,
  ...rest: C
): A & B & UnionToIntersection<C[number]> => {
  return Object.assign({}, qualifierA, qualifierB, ...rest);
};
