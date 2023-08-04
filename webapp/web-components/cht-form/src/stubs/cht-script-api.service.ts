import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';
// import { DbService as BaseDbService } from '../../../../src/ts/services/db.service';

@Injectable({
  providedIn: AppModule
})
export class CHTScriptApiService {
  isInitialized(): any {
    throw new Error('Method not implemented.');
  }

  async getApi(): Promise<any> {
    throw new Error('Method not implemented.');
  }

}
