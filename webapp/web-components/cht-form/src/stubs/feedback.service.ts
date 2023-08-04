import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class FeedbackService {
  init () {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submit (info, isManual?): Promise<any> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _setOptions(_options) {
    throw new Error('Method not implemented.');
  }

}
