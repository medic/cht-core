import { isRecord, Nullable } from '../../libs/core';
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

/** @internal*/
export const dehydrateDoc = (lineage:Record<string, unknown>):Record<string, unknown> => {
  if (isRecord(lineage.parent)){
    return {
      _id: lineage._id,
      parent: dehydrateDoc(lineage.parent)
    };
  }
  return {
    _id: lineage._id
  };
};
  
/** @internal*/
export const isSameLineage = (
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined
): boolean => {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }

  if (a._id !== b._id) {
    return false;
  }

  const aParent = a.parent as Record<string, unknown> | undefined;
  const bParent = b.parent as Record<string, unknown> | undefined;
  return isSameLineage(aParent, bParent);
};

/** @internal*/
export const ensureHasRequiredImmutableFields=(
  fields:Set<string>, 
  originalDoc: Doc, 
  updateInput:Record<string, unknown>
):void => {
  // ensure required immutable fields have the same value as the original doc.
  for (const field of Array.from(fields)) {
    if (updateInput[field] !== originalDoc[field]){
      throw new InvalidArgumentError(
        `Value ${JSON.stringify(
          updateInput[field]
        )} of immutable field '${field}' does not match with the original doc`
      );
    }
  }
};
