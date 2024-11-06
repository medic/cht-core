import { isString, hasField, isRecord } from './libs/core';
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
 * @throws Error if the search string is not provided or is empty
 */
export const byFreetext = (freetext: string): FreetextQualifier => {
  if (!isString(freetext) || freetext.length === 0) {
    throw new InvalidArgumentError(`Invalid freetext [${JSON.stringify(freetext)}].`);
  }

  return { freetext };
};

/**
 * Returns `true` if the given qualifier is a {@link FreetextQualifier} otherwise `false`.
 * @param qualifier the qualifier to check
 * @returns `true` if the given type is a {@link FreetextQualifier}, otherwise `false`.
 */
export const isFreetextQualifier = (qualifier: unknown): qualifier is FreetextQualifier => {
  return isRecord(qualifier);
};
