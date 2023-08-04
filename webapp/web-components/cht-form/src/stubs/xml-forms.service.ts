import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class XmlFormsService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async canAccessForm(form, userContact, options?): Promise<any> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subscribe(name, options, callback?): any {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getDocAndFormAttachment(internalId): any {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get(internalId): any {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  list(options?): any {
    throw new Error('Method not implemented.');
  }
}
