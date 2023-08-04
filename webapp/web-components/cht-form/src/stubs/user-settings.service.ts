import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class UserSettingsService {
  get(): Promise<Object> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  put(doc): Promise<Object> {
    throw new Error('Method not implemented.');
  }


  setAsKnown(): Promise<Object> {
    throw new Error('Method not implemented.');
  }
}
