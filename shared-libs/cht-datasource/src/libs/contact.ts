import { Doc } from './doc';

export interface Contact extends Doc {
  contact_type?: string;
  name?: string;
  parent_id?: string;
  reported_date?: Date;
  type: string;
}
