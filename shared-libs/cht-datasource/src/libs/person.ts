import { v1 as doc } from './doc';
const { isUuidIdentifier } = doc;

export const validateIdentifier = (identifier: unknown): identifier is V1.UuidIdentifier => {
  if (isUuidIdentifier(identifier)) {
    return true;
  }
  throw new Error('Invalid identifier');
};
