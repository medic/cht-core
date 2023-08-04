import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';
// import { DbService as BaseDbService } from '../../../../src/ts/services/db.service';

@Injectable({
  providedIn: AppModule
})
export class UserSettingsService {
  get(): Promise<Object> {
    throw new Error('Method not implemented.');
  }

  put(doc): Promise<Object> {
    throw new Error('Method not implemented.');
  }


  setAsKnown(): Promise<Object> {
    throw new Error('Method not implemented.');
  }
}
