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
 * A qualifier that identifies entities based on a phone number.
 */
export type PhoneQualifier = Readonly<{ phone: string }>;

/**
 * Builds a qualifier for finding entities by their `phone` field.
 * @param phone the phone number to search for. Passed as-is to the underlying view.
 * @returns the qualifier
 * @throws InvalidArgumentError if the phone is not a non-empty string
 */
export const byPhone = (phone: string): PhoneQualifier => {
  if (!isString(phone) || phone.length === 0) {
    throw new InvalidArgumentError(`Invalid phone [${JSON.stringify(phone)}].`);
  }
  return { phone };
};

/**
 * Returns `true` if the given qualifier is a {@link PhoneQualifier}, otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given qualifier is a {@link PhoneQualifier}, otherwise `false`
 */
export const isPhoneQualifier = (qualifier: unknown): qualifier is PhoneQualifier => {
  return isRecord(qualifier) && hasField(qualifier, { name: 'phone', type: 'string' });
};

/**
 * Bulk variant of {@link PhoneQualifier}
 */
export type PhonesQualifier = Readonly<{ phones: [string, ...string[]] }>;

/**
 * Builds a qualifier for finding entities whose `phone` field matches any of the given values.
 * @param phones the phone numbers to search for. Passed as-is to the underlying view.
 * @returns the qualifier
 * @throws InvalidArgumentError if `phones` is not a non-empty array of non-empty strings
 */
export const byPhones = (phones: [string, ...string[]]): PhonesQualifier => {
  if (!Array.isArray(phones) || phones.length === 0 || !phones.every(p => isString(p) && p.length > 0)) {
    throw new InvalidArgumentError(`Invalid phones [${JSON.stringify(phones)}].`);
  }
  return { phones };
};

/**
 * Returns `true` if the given qualifier is a {@link PhonesQualifier}, otherwise `false`.
 * @param qualifier the qualifier to check
 */
export const isPhonesQualifier = (qualifier: unknown): qualifier is PhonesQualifier => {
  return isRecord(qualifier)
    && hasField(qualifier, { name: 'phones', type: 'object' })
    && Array.isArray(qualifier.phones)
    && qualifier.phones.length > 0
    && qualifier.phones.every(p => typeof p === 'string' && p.length > 0);
};

/**
 * A qualifier that identifies contacts by a shortcode (e.g. a `patient_id` or `place_id`).
 */
export type ShortcodeQualifier = Readonly<{ shortcode: string }>;

/**
 * Builds a qualifier for finding contacts by their shortcode (`patient_id` or `place_id`).
 * @param shortcode the shortcode to search for. Passed as-is to the underlying view.
 * @returns the qualifier
 * @throws InvalidArgumentError if the shortcode is not a non-empty string
 */
export const byShortcode = (shortcode: string): ShortcodeQualifier => {
  if (!isString(shortcode) || shortcode.length === 0) {
    throw new InvalidArgumentError(`Invalid shortcode [${JSON.stringify(shortcode)}].`);
  }
  return { shortcode };
};

/**
 * Returns `true` if the given qualifier is a {@link ShortcodeQualifier}, otherwise `false`.
 * @param qualifier the qualifier to check
 */
export const isShortcodeQualifier = (qualifier: unknown): qualifier is ShortcodeQualifier => {
  return isRecord(qualifier) && hasField(qualifier, { name: 'shortcode', type: 'string' });
};

/**
 * Bulk variant of {@link ShortcodeQualifier}
 */
export type ShortcodesQualifier = Readonly<{ shortcodes: [string, ...string[]] }>;

/**
 * Builds a qualifier for finding contacts whose shortcode matches any of the given values.
 * @param shortcodes the shortcodes to search for. Passed as-is to the underlying view.
 * @returns the qualifier
 * @throws InvalidArgumentError if `shortcodes` is not a non-empty array of non-empty strings
 */
export const byShortcodes = (shortcodes: [string, ...string[]]): ShortcodesQualifier => {
  if (!Array.isArray(shortcodes) || shortcodes.length === 0 || !shortcodes.every(s => isString(s) && s.length > 0)) {
    throw new InvalidArgumentError(`Invalid shortcodes [${JSON.stringify(shortcodes)}].`);
  }
  return { shortcodes };
};

/**
 * Returns `true` if the given qualifier is a {@link ShortcodesQualifier}, otherwise `false`.
 * @param qualifier the qualifier to check
 */
export const isShortcodesQualifier = (qualifier: unknown): qualifier is ShortcodesQualifier => {
  return isRecord(qualifier)
    && hasField(qualifier, { name: 'shortcodes', type: 'object' })
    && Array.isArray(qualifier.shortcodes)
    && qualifier.shortcodes.length > 0
    && qualifier.shortcodes.every(s => typeof s === 'string' && s.length > 0);
};

/**
 * A qualifier that identifies contacts by an external reference code (`rc_code`). The reference is
 * upper-cased to match the value emitted by the underlying view.
 */
export type ExternalRefQualifier = Readonly<{ externalRef: string }>;

/**
 * Builds a qualifier for finding contacts by their external reference code (`rc_code`).
 * @param externalRef the reference to search for. Upper-cased to match the underlying view.
 * @returns the qualifier
 * @throws InvalidArgumentError if the reference is not a non-empty string
 */
export const byExternalRef = (externalRef: string): ExternalRefQualifier => {
  if (!isString(externalRef) || externalRef.length === 0) {
    throw new InvalidArgumentError(`Invalid external ref [${JSON.stringify(externalRef)}].`);
  }
  return { externalRef: externalRef.toUpperCase() };
};

/**
 * Returns `true` if the given qualifier is an {@link ExternalRefQualifier}, otherwise `false`.
 * @param qualifier the qualifier to check
 */
export const isExternalRefQualifier = (qualifier: unknown): qualifier is ExternalRefQualifier => {
  return isRecord(qualifier) && hasField(qualifier, { name: 'externalRef', type: 'string' });
};

/**
 * Bulk variant of {@link ExternalRefQualifier}
 */
export type ExternalRefsQualifier = Readonly<{ externalRefs: [string, ...string[]] }>;

/**
 * Builds a qualifier for finding contacts whose external reference matches any of the given values.
 * @param externalRefs the references to search for. Each is upper-cased to match the underlying view.
 * @returns the qualifier
 * @throws InvalidArgumentError if `externalRefs` is not a non-empty array of non-empty strings
 */
export const byExternalRefs = (externalRefs: [string, ...string[]]): ExternalRefsQualifier => {
  if (
    !Array.isArray(externalRefs)
    || externalRefs.length === 0
    || !externalRefs.every(r => isString(r) && r.length > 0)
  ) {
    throw new InvalidArgumentError(`Invalid external refs [${JSON.stringify(externalRefs)}].`);
  }
  return { externalRefs: externalRefs.map(r => r.toUpperCase()) as [string, ...string[]] };
};

/**
 * Returns `true` if the given qualifier is an {@link ExternalRefsQualifier}, otherwise `false`.
 * @param qualifier the qualifier to check
 */
export const isExternalRefsQualifier = (qualifier: unknown): qualifier is ExternalRefsQualifier => {
  return isRecord(qualifier)
    && hasField(qualifier, { name: 'externalRefs', type: 'object' })
    && Array.isArray(qualifier.externalRefs)
    && qualifier.externalRefs.length > 0
    && qualifier.externalRefs.every(r => typeof r === 'string' && r.length > 0);
};

/**
 * The set of qualifier shapes accepted by `Contact.v1.getUuidsPage` / `Contact.v1.getUuids` for
 * filtering contacts.
 */
export type ContactGetUuidsQualifier =
  | ContactTypeQualifier
  | FreetextQualifier
  | PhoneQualifier
  | PhonesQualifier
  | ShortcodeQualifier
  | ShortcodesQualifier
  | ExternalRefQualifier
  | ExternalRefsQualifier;

/**
 * Returns `true` if the given qualifier is any member of {@link ContactGetUuidsQualifier}.
 * @param qualifier the qualifier to check
 */
export const isContactGetUuidsQualifier = (qualifier: unknown): qualifier is ContactGetUuidsQualifier => {
  return isContactTypeQualifier(qualifier)
    || isFreetextQualifier(qualifier)
    || isPhoneQualifier(qualifier)
    || isPhonesQualifier(qualifier)
    || isShortcodeQualifier(qualifier)
    || isShortcodesQualifier(qualifier)
    || isExternalRefQualifier(qualifier)
    || isExternalRefsQualifier(qualifier);
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
