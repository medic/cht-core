import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  async get(): Promise<Object> {
    console.log('UserSettingsService.get()');
    return {
      contact_id: 'user_contact_id'
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  put(doc): Promise<Object> {
    throw new Error('Method not implemented.');
  }


  setAsKnown(): Promise<Object> {
    throw new Error('Method not implemented.');
  }
}
