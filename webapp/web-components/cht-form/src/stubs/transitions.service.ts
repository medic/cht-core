import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';

@Injectable({
  providedIn: AppModule
})
export class TransitionsService {
  init() {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async applyTransitions(docs) {
    throw new Error('Method not implemented.');
  }

}
