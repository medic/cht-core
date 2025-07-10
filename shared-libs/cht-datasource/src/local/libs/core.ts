import { Nullable } from '../../libs/core';
import { Doc } from '../../libs/doc';
import { InvalidArgumentError } from '../../libs/error';

/** @internal */
export const validateCursor = (cursor: Nullable<string>): number => {
  const skip = Number(cursor);
  if (isNaN(skip) || skip < 0 || !Number.isInteger(skip)) {
    throw new InvalidArgumentError(`The cursor must be a string or null for first page: [${JSON.stringify(cursor)}].`);
  }
  return skip;
};

/** @internal */
export const normalizeFreetext = (
  freetext: string,
): string => {
  return freetext.trim().toLowerCase();
};

/** @internal*/
export const getUpdatedFields = (
  originalDoc:Record<string, unknown>,
  updatedDoc : Record<string, unknown>,
  ignoreUpdateFields : Set<string>
):Record<string, unknown> => {
  const updatedFields:Record<string, unknown> = {};
  for (const key of Object.keys(originalDoc)) {
    if (ignoreUpdateFields.has(key)) {
      continue;
    }
    if (updatedDoc[key] ===undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete originalDoc[key];
      continue;
    }
    updatedFields[key] = updatedDoc[key];
  }
  return updatedFields;
};

interface HasParentOrContact {
  contact?: string;
  parent?: string;
}

/** @internal*/
export const addParentToInput = <T extends HasParentOrContact>(
  input: T,
  key: 'contact' | 'parent',
  parentDoc: Doc
): T => {
  const value = { _id: input[key] };
  if (parentDoc.parent) {
    Object.assign(value, { parent: parentDoc.parent });
  }
  return {
    ...input,
    [key]: value,
  };
};
