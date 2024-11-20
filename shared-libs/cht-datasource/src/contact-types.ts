import { DataObject, Identifiable, isDataObject, isIdentifiable, Nullable } from './libs/core';
import { Doc } from './libs/doc';
import {
  byContactType,
  byFreetext,
  ContactTypeQualifier,
  FreetextQualifier,
  isUuidQualifier,
  UuidQualifier
} from './qualifier';
import { InvalidArgumentError } from './libs/error';

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

  /** @ignore */
  export const isContactType = (value: ContactTypeQualifier | FreetextQualifier): value is ContactTypeQualifier => {
    return 'contactType' in value;
  };

  /** @ignore */
  export const isFreetextType = (value: ContactTypeQualifier | FreetextQualifier): value is FreetextQualifier => {
    return 'freetext' in value;
  };

  /** @ignore */
  export const assertContactQualifier: (
    qualifier: unknown
  ) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
    if (!isUuidQualifier(qualifier)) {
      throw new InvalidArgumentError(`Invalid identifier [${JSON.stringify(qualifier)}].`);
    }
  };

  /** @ignore */
  export const createQualifier = (
    freetext: Nullable<string> = null,
    type: Nullable<string> = null
  ): ContactTypeQualifier | FreetextQualifier => {
    if (!freetext && !type) {
      throw new InvalidArgumentError('Either "freetext" or "type" is required');
    }

    const qualifier = {};
    if (freetext) {
      Object.assign(qualifier, byFreetext(freetext));
    }

    if (type) {
      Object.assign(qualifier, byContactType(type));
    }

    return qualifier as ContactTypeQualifier | FreetextQualifier;
  };
}
