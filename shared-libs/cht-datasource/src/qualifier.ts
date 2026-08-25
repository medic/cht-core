import { hasField, isRecord, isString } from './libs/core';
import { InvalidArgumentError } from './libs/error';

/**
 * A qualifier that identifies an entity.
 */
export type IdQualifier = Readonly<{ id: string }>;

/**
 * Builds a qualifier that identifies an entity.
 * @param id the identifier of the entity
 * @returns the qualifier
 * @throws InvalidArgumentError if the identifier is invalid
 */
export const byId = (id: string): IdQualifier => {
  if (!isString(id) || id.length === 0) {
    throw new InvalidArgumentError(`Invalid id [${JSON.stringify(id)}].`);
  }
  return { id };
};

/**
 * Returns `true` if the given qualifier is an {@link IdQualifier}, otherwise `false`.
 * @param identifier the identifier to check
 * @returns `true` if the given identifier is a {@link IdQualifier}, otherwise `false`
 */
export const isIdQualifier = (identifier: unknown): identifier is IdQualifier => {
  return isRecord(identifier) && hasField(identifier, { name: 'id', type: 'string' });
};

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
 * A qualifier that identifies entities by their identifiers.
 */
export type IdsQualifier = Readonly<{ ids: string[] }>;

/**
 * Returns `true` if the given qualifier is an {@link IdsQualifier}, otherwise `false`. An empty array of identifiers is
 * considered valid.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is an {@link IdsQualifier}, otherwise `false`
 */
export const isIdsQualifier = (qualifier: unknown): qualifier is IdsQualifier => {
  return isRecord(qualifier)
    && hasField(qualifier, { name: 'ids', type: 'object' })
    && Array.isArray(qualifier.ids)
    && qualifier.ids.every(id => isString(id) && id.length > 0);
};

/**
 * Builds a qualifier that identifies entities by their identifiers.
 * @param ids the identifiers of the entities
 * @returns the qualifier
 * @throws InvalidArgumentError if the identifiers are not an array of non-empty strings
 */
export const byIds = (ids: string[]): IdsQualifier => {
  const qualifier = { ids };
  if (!isIdsQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid identifiers [${JSON.stringify(ids)}].`);
  }
  return { ids: [...new Set(ids)] };
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
 * A qualifier that identifies contacts by their phone numbers.
 */
export type PhonesQualifier = Readonly<{ phones: [string, ...string[]] }>;

/**
 * Builds a qualifier for finding contacts with any of the given phone numbers. Duplicates are removed.
 * @param phones the phone numbers of the contacts, each matched verbatim against the contact's `phone` field
 * @returns the qualifier
 * @throws InvalidArgumentError if the phone numbers are not a non-empty array of non-blank strings with no
 * leading or trailing whitespace
 */
export const byPhones = (phones: [string, ...string[]]): PhonesQualifier => {
  const qualifier = { phones };
  if (!isPhonesQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid phones [${JSON.stringify(phones)}].`);
  }

  // Deduping a non-empty array keeps it non-empty, which TS cannot infer on its own.
  return { phones: [...new Set(phones)] as [string, ...string[]] };
};

/**
 * Returns `true` if the given qualifier is a {@link PhonesQualifier} otherwise `false`. Phone numbers are
 * matched verbatim, so an empty array of phone numbers is considered invalid, as is a number that is blank
 * or padded with whitespace.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is a {@link PhonesQualifier}, otherwise `false`.
 */
export const isPhonesQualifier = (qualifier: unknown): qualifier is PhonesQualifier => {
  return isRecord(qualifier)
    && hasField(qualifier, { name: 'phones', type: 'object' })
    && Array.isArray(qualifier.phones)
    && qualifier.phones.length > 0
    && qualifier.phones.every(phone => isString(phone) && phone.length > 0 && phone === phone.trim());
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
 * A qualifier that identifies entities based on the codes of the forms used to record them.
 */
export type FormsQualifier = Readonly<{ forms: [string, ...string[]] }>;

/**
 * Builds a qualifier for finding entities recorded with any of the given forms.
 * @param forms the form codes to search with (e.g. `['pregnancy']`). Each is matched verbatim against
 * the document's `form` field: they are not normalized, so a code with leading or trailing whitespace
 * is rejected rather than silently matching nothing. Duplicates are removed.
 * @returns the qualifier
 * @throws InvalidArgumentError if the form codes are not a non-empty array of non-blank strings with no
 * leading or trailing whitespace
 */
export const byForms = (forms: [string, ...string[]]): FormsQualifier => {
  const qualifier = { forms };
  if (!isFormsQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid forms [${JSON.stringify(forms)}].`);
  }

  // Deduping a non-empty array can only ever keep it non-empty, so the tuple shape survives the Set
  // round-trip; TS just cannot see that on its own.
  return { forms: [...new Set(forms)] as [string, ...string[]] };
};

/**
 * Returns `true` if the given qualifier is a {@link FormsQualifier} otherwise `false`.
 *
 * The qualifier must have a `forms` key holding a non-empty array of strings, none of which is empty,
 * blank, or padded with leading/trailing whitespace. Unlike {@link isIdsQualifier}, an empty array is
 * rejected: it can only ever match nothing, which is never what the caller meant, and silently
 * returning an empty page would hide the mistake. A padded code is rejected for the same reason: it
 * would otherwise pass validation but match nothing, since the value is compared verbatim rather than
 * trimmed.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is a {@link FormsQualifier}, otherwise `false`.
 */
export const isFormsQualifier = (qualifier: unknown): qualifier is FormsQualifier => {
  return isRecord(qualifier)
    && hasField(qualifier, { name: 'forms', type: 'object' })
    && Array.isArray(qualifier.forms)
    && qualifier.forms.length > 0
    && qualifier.forms.every(form => isString(form) && form.length > 0 && form === form.trim());
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
 * A qualifier that identifies entities based on their association with the identified contact.
 */
export interface ContactIdQualifier {
  readonly contactId: string
}

/**
 * Returns `true` if the given qualifier is a {@link ContactIdQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is a {@link ContactIdQualifier}, otherwise `false`.
 */
export const isContactIdQualifier = (qualifier: unknown): qualifier is ContactIdQualifier => {
  return isRecord(qualifier) &&
    hasField(qualifier, { name: 'contactId', type: 'string' }) &&
    qualifier.contactId.length > 0;
};

/**
 * Builds a qualifier for finding entities by contact identifier.
 * @param contactId the contact identifier to search with
 * @returns the qualifier
 * @throws InvalidArgumentError if the contact identifier is not valid
 */
export const byContactId = (contactId: string): ContactIdQualifier => {
  const qualifier = { contactId };
  if (!isContactIdQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid contact Id [${contactId}].`);
  }
  return qualifier;
};

/**
 * A qualifier that identifies entities based on their association with the identified contacts.
 */
export interface ContactIdsQualifier {
  readonly contactIds: [string, ...string[]]
}

/**
 * Returns `true` if the given qualifier is a {@link ContactIdsQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is a {@link ContactIdsQualifier}, otherwise `false`.
 */
export const isContactIdsQualifier = (qualifier: unknown): qualifier is ContactIdsQualifier => {
  return isRecord(qualifier)
    && hasField(qualifier, { name: 'contactIds', type: 'object' })
    && Array.isArray(qualifier.contactIds)
    && qualifier.contactIds.length > 0
    && qualifier.contactIds.every((contactId) => contactId?.length > 0);
};

/**
 * Builds a qualifier for finding entities by contact identifiers.
 * @param contactIds the contact identifiers to search with
 * @returns the qualifier
 * @throws InvalidArgumentError if the contact identifiers are not valid
 */
export const byContactIds = (contactIds: [string, ...string[]]): ContactIdsQualifier => {
  const qualifier = { contactIds };
  if (!isContactIdsQualifier(qualifier)) {
    throw new InvalidArgumentError(`Invalid contact Ids [${contactIds}].`);
  }
  return qualifier;
};

// https://stackoverflow.com/a/50375286
/**
 * The intersection of the specified types.
 * @internal
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void ? I : never;

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
