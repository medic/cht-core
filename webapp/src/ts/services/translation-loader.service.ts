const DEFAULT_LOCALE = 'en';
const DOC_ID_PREFIX = 'messages-';

import { Injectable } from '@angular/core';

import { SettingsService } from '../services/settings.service';

@Injectable({
  providedIn: 'root'
})
export class TranslationLoaderService {
  private readonly re = new RegExp(`^${DOC_ID_PREFIX}([a-zA-Z]+)$`);
  constructor(private settings:SettingsService) {}

  getLocale() {
    return this.settings.get().then((settings:any) => {
      return settings.locale || DEFAULT_LOCALE;
    });
  }

  test(docId?) {
    return docId && this.re.test(docId);
  }

  getCode(docId?) {
    if (!docId) {
      return false;
    }
    const match = docId.toString().match(this.re);
    return match && match[1];
  };
}
