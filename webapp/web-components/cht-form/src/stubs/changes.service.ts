import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';
// import { DbService as BaseDbService } from '../../../../src/ts/services/db.service';

@Injectable({
  providedIn: AppModule
})
export class ChangesService {
  subscribe(options): any {
    throw new Error('Method not implemented.');
  }

  killWatchers() {
    throw new Error('Method not implemented.');
  }

}
