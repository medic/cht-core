import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';
// import { DbService as BaseDbService } from '../../../../src/ts/services/db.service';

@Injectable({
  providedIn: AppModule
})
export class TransitionsService {
  init() {
    throw new Error('Method not implemented.');
  }

  async applyTransitions(docs) {
    throw new Error('Method not implemented.');
  }

}
