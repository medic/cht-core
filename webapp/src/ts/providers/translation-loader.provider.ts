import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { from } from 'rxjs';

import { DbService } from '@mm-services/db.service';
import * as translationUtils from '@medic/translation-utils';
import { TranslationDocsMatcherProvider } from '@mm-providers/translation-docs-matcher.provider';
import { LanguageService } from '@mm-services/language.service';

@Injectable()
export class TranslationLoaderProvider implements TranslateLoader {
  constructor(
    private db: DbService,
    private languageService: LanguageService
  ) {}

  private loadingPromises = {};

  getTranslation(locale) {
    if (!locale) {
      return undefined as any;
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
      .then((doc:{ generic: {}; custom: {}; rtl: boolean }) => {
        const values = Object.assign(doc.generic || {}, doc.custom || {});
        if (testing) {
          mapTesting(values);
        }
        doc.rtl && this.languageService.setRtlLanguage(locale);
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
