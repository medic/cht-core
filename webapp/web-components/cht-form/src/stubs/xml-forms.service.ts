import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';
// import { DbService as BaseDbService } from '../../../../src/ts/services/db.service';

@Injectable({
  providedIn: AppModule
})
export class XmlFormsService {
  async canAccessForm(form, userContact, options?): Promise<any> {
    throw new Error('Method not implemented.');
  }

  subscribe(name, options, callback?): any {
    throw new Error('Method not implemented.');
  }

  getDocAndFormAttachment(internalId): any {
    throw new Error('Method not implemented.');
  }

  get(internalId): any {
    throw new Error('Method not implemented.');
  }

  list(options?): any {
    throw new Error('Method not implemented.');
  }
}
