import { Injectable } from '@angular/core';
import { AppModule } from '../app.module';
// import { DbService as BaseDbService } from '../../../../src/ts/services/db.service';

@Injectable({
  providedIn: AppModule
})
export class LanguageService {
  // private isOnlineOnly;
  // private cache;
  // private POUCHDB_METHODS;
  // private outOfZonePromise;
  // private outOfZoneEventEmitter;
  // private outOfZoneReplicate;
  // private sessionService;
  // private  locationService;
  // private  ngZone;
  // private getUsername;
  // private getDbName;
  // private getParams;
  // private wrapMethods;
  async get(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  useDevanagariScript(): boolean {
    throw new Error('Method not implemented.');
  }
}
