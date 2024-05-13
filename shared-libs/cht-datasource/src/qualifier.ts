import { hasField, isRecord } from './libs/core';

/**
 * A qualifier that identifies an entity by its UUID.
 */
export type UuidQualifier = Readonly<{ uuid: string }>;

/**
 * Builds a qualifier that identifies an entity by its UUID.
 * @param uuid { string } the UUID of the entity
 * @return { UuidQualifier } the qualifier
 */
export const byUuid = (uuid: string): UuidQualifier => ({ uuid })

/**
 * Returns <code>true</code> if the given qualifier is a <code>UuidQualifier</code>, otherwise <code>false</code>.
 * @param identifier the identifier to check
 * @return { boolean } <code>true</code> if the given identifier is a <code>UuidQualifier</code>, otherwise
 * <code>false</code>
 */
export const isUuidQualifier = (identifier: unknown): identifier is UuidQualifier => {
  return isRecord(identifier) && hasField(identifier, { name: 'uuid', type: 'string' });
};
