import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { CacheService } from '@mm-services/cache.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private cache;
  private readonly SETTINGS_ID = 'settings';

  constructor(
    private db: DbService,
    private cacheService: CacheService
  ) {
    this.cache = this.cacheService.register({
      get: (callback) => {
        this.db.get()
          .get(this.SETTINGS_ID)
          .then((doc) => {
            callback(null, doc.settings);
          })
          .catch(callback);
      },
      invalidate: (change) => {
        return change.id === this.SETTINGS_ID;
      }
    });
  }

  get():Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      this.cache((err, settings) => {
        if (err) {
          return reject(err);
        }

        resolve(settings);
      });
    });
  }
}
