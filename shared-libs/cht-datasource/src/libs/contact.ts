import { Doc } from './doc';
import { DataObject } from './core';

interface DehydratedParent extends DataObject {
  _id: string;
  parent?: DehydratedParent;
}

/** @internal */
export interface Contact extends Doc {
  contact_type?: string;
  name?: string;
  parent?: DehydratedParent;
  reported_date?: Date;
  type: string;
}
