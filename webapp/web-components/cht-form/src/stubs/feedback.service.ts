import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';
// import { DbService as BaseDbService } from '../../../../src/ts/services/db.service';

@Injectable({
  providedIn: AppModule
})
export class FeedbackService {
  init () {
    throw new Error('Method not implemented.');
  }

  submit (info, isManual?): Promise<any> {
    throw new Error('Method not implemented.');
  }

  _setOptions(_options) {
    throw new Error('Method not implemented.');
  }

}
