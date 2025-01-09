import { DataObject, Identifiable, isDataObject, isIdentifiable } from './libs/core';
import { Doc } from './libs/doc';

/** @ignore */
export namespace v1 {
  /** @internal */
  export interface NormalizedParent extends DataObject, Identifiable {
    readonly parent?: NormalizedParent;
  }

  /** @internal */
  export interface Contact extends Doc, NormalizedParent {
    readonly contact_type?: string;
    readonly name?: string;
    readonly reported_date?: Date;
    readonly type: string;
  }

  /** @internal */
  export interface ContactWithLineage extends Contact {
    readonly parent?: ContactWithLineage | NormalizedParent;
  }
  
  /** @ignore */
  export const isNormalizedParent = (value: unknown): value is NormalizedParent => {
    return isDataObject(value) && isIdentifiable(value) && (!value.parent || isNormalizedParent(value.parent));
  };
}
