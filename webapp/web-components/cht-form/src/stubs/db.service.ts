import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public get({ remote=false, meta=false, usersMeta=false }={}): any {
    console.log(`DbService.get(remote = ${remote}, meta = ${meta}, usersMeta = ${usersMeta})`);
    return {
      get: async (id) => {
        console.log(`DbService.get.get(${id})`);

        if(id === 'user_contact_id') {
          return { _id: 'user_contact_id', name: 'user_contact_name' };
        }
        throw new Error(`Doc: ${id} not found.`);
      },
      // query: async (selector, options) => {
      //   console.log(`DbService.get.query(${selector}, ${JSON.stringify(options)})`);
      //   if(selector ===  'medic-client/docs_by_id_lineage') {
      //     return { rows: [{ doc: { _id: 'user_contact_parent_id', name: 'user_contact_parent_name' } }] };
      //   }
      //   throw new Error(`Doc: ${JSON.stringify(selector)} not found.`);
      // },
      getAttachment: (formId, attachment) => {
        console.log(`DbService.get.getAttachment(${formId}, ${attachment})`);
        // if (attachment === 'form.html') {
        //   return Promise.resolve(new Blob([this.formHtml]));
        // }
        // if (attachment === 'model.xml') {
        //   return Promise.resolve(new Blob([this.formModel]));
        // }
        // if (attachment === 'form.xml') {
        //   return Promise.resolve(new Blob([this.formXml]));
        // }

        // assume media attachment
        return Promise.resolve(new Blob());
      },
    };
  }
}
