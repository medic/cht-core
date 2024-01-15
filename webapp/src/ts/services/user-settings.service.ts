import {Injectable} from '@angular/core';

import { CacheService } from '@mm-services/cache.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { LanguageService } from '@mm-services/language.service';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly cache;
  constructor(
    private cacheService:CacheService,
    private dbService:DbService,
    private languageService:LanguageService,
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

  async getWithLanguage(): Promise<Object> {
    const [userSettings, language] = await Promise.all([
      this.get(),
      this.languageService.get()
    ]);
    return { ...userSettings, language };
  }

  put(doc): Promise<Object> {
    return this.dbService
      .get()
      .put(doc);
  }

  setAsKnown(): Promise<Object> {
    return this.get()
      .then((userSettings:any) => {
        userSettings.known = true;
        return this.put(userSettings);
      });
  }

}
