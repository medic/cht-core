import { Injectable } from '@angular/core';

@Injectable()
export class TranslationDocsMatcherProvider {
  private static DOC_ID_PREFIX = 'messages-';
  private static translationsDocIdMatcher = new RegExp(`^${TranslationDocsMatcherProvider.DOC_ID_PREFIX}([a-zA-Z]+)$`);

  static test(docId?) {
    return docId && this.translationsDocIdMatcher.test(docId);
  }

  static getLocaleCode(docId?) {
    if (!docId) {
      return false;
    }
    const match = docId.toString().match(this.translationsDocIdMatcher);
    return match && match[1];
  }

  static getTranslationsDocId(locale) {
    return this.DOC_ID_PREFIX + locale;
  }
}
