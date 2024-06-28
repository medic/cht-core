import { Doc } from './doc';
import { DataObject, Identifiable, isDataObject, isIdentifiable } from './core';

/** @internal */
export interface NormalizedParent extends DataObject, Identifiable {
  readonly parent?: NormalizedParent;
}

/** @internal */
export const isNormalizedParent = (value: unknown): value is NormalizedParent => {
  return isDataObject(value)
    && isIdentifiable(value)
    && (!value.parent || isNormalizedParent(value.parent));
};

/** @internal */
export interface Contact extends Doc, NormalizedParent {
  readonly contact_type?: string;
  readonly name?: string;
  readonly reported_date?: Date;
  readonly type: string;
}
