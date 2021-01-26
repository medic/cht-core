import { Injectable } from '@angular/core';

@Injectable()
export class TranslationDocsMatcherProvider {
  private static DOC_ID_PREFIX = 'messages-';
  private static translationsDocIdMatcher = new RegExp(`^${TranslationDocsMatcherProvider.DOC_ID_PREFIX}(.+)$`);

  static test(docId?) {
    return docId && TranslationDocsMatcherProvider.translationsDocIdMatcher.test(docId);
  }

  static getLocaleCode(docId?) {
    if (!docId) {
      return false;
    }
    const match = docId.toString().match(TranslationDocsMatcherProvider.translationsDocIdMatcher);
    return match && match[1];
  }

  static getTranslationsDocId(locale?) {
    if (!locale) {
      return false;
    }

    return TranslationDocsMatcherProvider.DOC_ID_PREFIX + locale;
  }
}
