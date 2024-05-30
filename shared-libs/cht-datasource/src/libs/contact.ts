import { Doc } from './doc';
import { DataObject, hasField, isDataObject } from './core';

/** @internal */
export interface NormalizedParent extends DataObject {
  readonly _id: string;
  readonly parent?: NormalizedParent;
}

/** @internal */
export const isNormalizedParent = (value: unknown): value is NormalizedParent => {
  return isDataObject(value)
    && hasField(value, { name: '_id', type: 'string' })
    && (!value.parent || isNormalizedParent(value.parent));
};

/** @internal */
export interface Contact extends Doc, NormalizedParent {
  readonly contact_type?: string;
  readonly name?: string;
  readonly reported_date?: Date;
  readonly type: string;
}
