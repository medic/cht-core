import { Injectable } from '@angular/core';
import { TranslateLoader } from '@ngx-translate/core';
import { from } from 'rxjs';
import * as translationUtils from '@medic/translation-utils';

import { DbService } from '@admin-tool-services/db.service';

@Injectable()
export class TranslationLoaderProvider implements TranslateLoader {
  private loadingPromises: Record<string, Promise<any>> = {};

  constructor(private db: DbService) {}

  getTranslation(locale: string) {
    if (!locale) {
      return undefined as any;
    }

    if (locale in this.loadingPromises) {
      return from(this.loadingPromises[locale]);
    }

    const docId = `messages-${locale}`;

    const promise = this.db
      .get()
      .get(docId)
      .then((doc: { generic: Record<string, string>; custom: Record<string, string> }) => {
        const values = Object.assign(doc.generic || {}, doc.custom || {});
        return translationUtils.loadTranslations(values);
      })
      .catch((err: { status: number }) => {
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
