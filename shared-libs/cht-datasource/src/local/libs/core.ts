import { hasField, isRecord, Nullable } from '../../libs/core';
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
export const dehydrateDoc = (lineage: Record<string, unknown>): Record<string, unknown> => {
  if (isRecord(lineage.parent)) {
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
export const ensureHasRequiredFields = (
  immutableFields: Set<string>,
  mutableFields: Set<string>,
  originalDoc: Doc,
  updateInput: Record<string, unknown>,
): void => {
  const missingFieldsList = [];
  // ensure required immutable fields have the same value as the original doc.
  for (const field of [ ...immutableFields, ...mutableFields ]) {
    if (!hasField(
      updateInput,
      {
        type: typeof originalDoc[field],
        name: field,
        ensureTruthyValue: true
      }
    )) {
      missingFieldsList.push(field);
    }
  }
  if (missingFieldsList.length > 0) {
    throw new InvalidArgumentError(`Missing or empty required fields (${missingFieldsList.join(', ')}) for [${JSON
      .stringify(updateInput)}].`);
  }
};

/** @internal*/
export const ensureImmutability = (
  immutableFields: Set<string>,
  originalDoc: Doc,
  updateInput: Record<string, unknown>,
): void => {
  for (const field of Array.from(immutableFields)) {
    if (field === 'parent' || field === 'contact') {
      checkFieldWithLineage(
        updateInput[field] as Record<string, unknown>,
        originalDoc[field] as Record<string, unknown>,
        field
      );
    } else if (updateInput[field] !== originalDoc[field]) {
      throw new InvalidArgumentError(
        `Value ${JSON.stringify(
          updateInput[field]
        )} of immutable field '${field}' does not match with the original doc`
      );
    }
  }
};

/** @internal*/
export const checkFieldWithLineage = (
  updateInputLineage: Record<string, unknown>,
  originalDocLineage: Record<string, unknown>,
  lineageType: 'parent' | 'contact'
): void => {
  if (!isSameLineage(
    updateInputLineage,
    originalDocLineage
  )) {
    throw new InvalidArgumentError(`${lineageType} lineage does not match with the lineage of the doc in the db`);
  }
};
