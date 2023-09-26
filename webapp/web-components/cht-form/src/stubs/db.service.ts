import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DbService {
  public readonly docs: Record<string, any>[] = [];

  public get(): any {
    return {
      get: async (id) => {
        const doc = this.docs.find(doc => doc._id === id);
        if (!doc) {
          console.log(`Doc not found: DbService.get.get(${id})`);
        }
        return doc;
      },
      query: async (selector, options) => {
        // if(selector ===  'medic-client/docs_by_id_lineage') {
        //   return { rows: [{ doc: { _id: 'user_contact_parent_id', name: 'user_contact_parent_name' } }] };
        // }
        if(selector ===  'medic-client/contacts_by_phone') {
          // Used by phone-widget to look for contacts with same phone number
          return { rows: [] };
        }
        throw new Error(`Unsupported selector: DbService.get.query(${selector}, ${JSON.stringify(options)})`);
      },
      getAttachment: (formId, attachment) => {
        console.log(`DbService.get.getAttachment(${formId}, ${attachment})`);
        // assume media attachment
        return Promise.resolve(new Blob());
      },
    };
  }
}
