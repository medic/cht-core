import { Doc } from './doc';
import { DataObject } from './core';

interface NormalizedParent extends DataObject {
  readonly _id: string;
  readonly parent?: NormalizedParent;
}

/** @internal */
export interface Contact extends Doc {
  readonly contact_type?: string;
  readonly name?: string;
  readonly parent?: NormalizedParent;
  readonly reported_date?: Date;
  readonly type: string;
}
