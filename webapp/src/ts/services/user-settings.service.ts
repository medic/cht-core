import {Injectable} from '@angular/core';
import { CacheService } from './cache.service';
import { DbService } from './db.service';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly cache;
  constructor(
    private cacheService:CacheService,
    private dbService:DbService,
    private sessionService:SessionService,
  ) {
    this.cache = this.cacheService.register({
      get: callback => {
        const docId = this.userDocId();
        this.dbService.get()
          .get(docId)
          .catch(() => {
            // might be first load - try the remote db
            return dbService.get({ remote: true }).get(docId);
          })
          .then(doc => {
            callback(null, doc);
          })
          .catch(callback);
      },
      invalidate: change => {
        const docId = this.userDocId();
        return change.id === docId;
      }
    });
  }

  private userDocId() {
    const userCtx = this.sessionService.userCtx();
    if (userCtx) {
      return 'org.couchdb.user:' + userCtx.name;
    }
  }

  get(): Promise<Object> {
    const docId = this.userDocId();
    if (!docId) {
      return Promise.reject(new Error('UserCtx not found'));
    }

    return new Promise((resolve, reject) => {
      this.cache((err, userSettings) => {
        if (err) {
          return reject(err);
        }
        resolve(userSettings);
      });
    });
  }

}
