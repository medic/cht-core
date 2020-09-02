import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { CacheService } from './cache.service';

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
          .then(function(doc) {
            callback(null, doc.settings);
          })
          .catch(callback);
      },
      invalidate: function(change) {
        return change.id === this.SETTINGS_ID;
      }
    });
  }

  get() {
    return new Promise((resolve, reject) => {
      this.cache((err, settings) => {
        if (err) {
          return reject(err);
        }

        resolve(settings);
      })
    });
  }
}
