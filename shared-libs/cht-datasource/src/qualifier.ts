import { isString, hasField, isRecord } from './libs/core';

/**
 * A qualifier that identifies an entity by its UUID.
 */
export type UuidQualifier = Readonly<{ uuid: string }>;

/**
 * Builds a qualifier that identifies an entity by its UUID.
 * @param uuid the UUID of the entity
 * @return the qualifier
 */
export const byUuid = (uuid: string): UuidQualifier => {
  if (!isString(uuid) || uuid.length === 0) {
    throw new Error(`Invalid UUID [${JSON.stringify(uuid)}].`);
  }
  return { uuid };
};

/**
 * Returns <code>true</code> if the given qualifier is a <code>UuidQualifier</code>, otherwise <code>false</code>.
 * @param identifier the identifier to check
 * @return <code>true</code> if the given identifier is a <code>UuidQualifier</code>, otherwise
 * <code>false</code>
 */
export const isUuidQualifier = (identifier: unknown): identifier is UuidQualifier => {
  return isRecord(identifier) && hasField(identifier, { name: 'uuid', type: 'string' });
};
