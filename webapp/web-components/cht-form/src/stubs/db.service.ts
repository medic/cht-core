import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DbService {
  public get(): any {
    return {
      get: () => Promise.resolve(),
      query: async (selector, options) => {
        if (selector === 'medic-client/contacts_by_phone') {
          // Used by phone-widget to look for contacts with same phone number
          return { rows: [] };
        }
        throw new Error(`Unsupported selector: DbService.get.query(${selector}, ${JSON.stringify(options)})`);
      },
      getAttachment: () => {
        // assume media attachment
        return Promise.resolve(new Blob());
      },
    };
  }
}
