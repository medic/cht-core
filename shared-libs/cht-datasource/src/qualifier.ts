import { isString, hasField, isRecord } from './libs/core';

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
    throw new Error(`Invalid UUID [${JSON.stringify(uuid)}].`);
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
