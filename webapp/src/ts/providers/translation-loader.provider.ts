import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { from } from 'rxjs';

import { DbService } from '../services/db.service';
import * as translationUtils from '@medic/translation-utils';
import { TranslationDocsMatcherProvider } from '@mm-providers/translation-docs-matcher.provider';

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

    const translationsDoc = TranslationDocsMatcherProvider.getTranslationsDocId(locale);

    const promise =  this.db
      .get()
      .get(translationsDoc)
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
  }
}
