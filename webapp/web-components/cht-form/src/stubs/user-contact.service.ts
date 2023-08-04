import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';
// import { DbService as BaseDbService } from '../../../../src/ts/services/db.service';

@Injectable({
  providedIn: AppModule
})
export class UserContactService {

  async get({ hydrateLineage = true } = {}): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
