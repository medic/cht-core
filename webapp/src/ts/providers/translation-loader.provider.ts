import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { from } from 'rxjs';

import { DbService } from '@mm-services/db.service';
import * as translationUtils from '@medic/translation-utils';
import { TranslationDocsMatcherProvider } from '@mm-providers/translation-docs-matcher.provider';

@Injectable()
export class TranslationLoaderProvider implements TranslateLoader {
  constructor(private db:DbService) {}

  private loadingPromises = {};

  getTranslation(locale) {
    if (!locale) {
      return;
    }

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

    const translationsDocId = TranslationDocsMatcherProvider.getTranslationsDocId(locale);

    const promise =  this.db
      .get()
      .get(translationsDocId)
      .then(doc => {
        const values = Object.assign(doc.generic || {}, doc.custom || {});
        if (testing) {
          mapTesting(values);
        }
        return translationUtils.loadTranslations(values);
      })
      .catch(err => {
        if ([401, 404].includes(err.status)) {
          return {};
        }
        throw err;
      })
      .finally(() => {
        delete this.loadingPromises[locale];
      });

    this.loadingPromises[locale] = promise;

    return from(promise);
  }
}
