const translationUtils = require('@medic/translation-utils');
const DOC_ID_PREFIX = 'messages-';

import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { from } from 'rxjs';

import { DbService } from '../services/db.service';

@Injectable()
export class TranslationLoaderProvider implements TranslateLoader {
  constructor(private db:DbService) {}

  private loadingPromises = {};

  getTranslation(locale) {
    if (this.loadingPromises[locale]) {
      return from(this.loadingPromises[locale]);
    }

    let testing = false;
    if (locale === 'test') {
      locale = 'en';
      testing = true;
    }

    const mapTesting = (doc) => {
      Object.keys(doc).forEach((key) => {
        doc[key] = '-' + doc[key] + '-';
      });
    };

    const promise =  this.db
      .get()
      .get(DOC_ID_PREFIX + locale)
      .then(doc => {
        const values = Object.assign(doc.generic || {}, doc.custom || {});
        if (testing) {
          mapTesting(values);
        }
        return translationUtils.loadTranslations(values);
      })
      .catch((err) => {
        if (err.status !== 404) {
          throw err;
        }
        return {};
      })
      .finally(() => {
        delete this.loadingPromises[locale];
      });

    this.loadingPromises[locale] = promise;

    return from(promise);
  };
}
